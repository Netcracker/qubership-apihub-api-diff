import { apiDiff, CompareOptions, DiffAction, } from '../src'
import { COMPARE_SCOPE_ROOT } from '../src/types'
import { createPropertyMappingResolver } from '../src/asyncapi/asyncapi3.mapping'
import { parseAsyncApiAndAssertValid } from './helper/asyncapi'
import { diffsMatcher } from './helper/matchers'
import { COMPARE_SCOPE_SEND } from '../src/asyncapi'
import { COMPARE_SCOPE_COMPONENTS } from '../src/graphapi'

// ------------------------------------------------------------------
// Spec factory
//
// Builds a minimal AsyncAPI 3 spec with:
//   - Two component servers: serverA, serverB
//   - Two component messages: MessageA (payload: string), MessageB (payload: integer)
//     Override via messagePayloads: { MessageA: { type: 'integer' } }
//   - A channel "myChannel" that references the given serverIds (in order) and
//     exposes the given messageIds as channel-level messages
//   - An operation "myOp" (send) that references the given messageIds (in order)
//     via the channel messages
// ------------------------------------------------------------------

interface MakeSpecOptions {
  serverIds?: string[]
  messageIds?: string[]
  messagePayloadsPatch?: Record<string, unknown>
  serversPatch?: Record<string, { host: string; protocol: string }>
  operationIds?: string[]
}

const DEFAULT_PAYLOADS: Record<string, unknown> = {
  MessageA: { type: 'string' },
  MessageB: { type: 'integer' },
}

const DEFAULT_SERVERS: Record<string, { host: string; protocol: string }> = {
  serverA: { host: 'localhost', protocol: 'amqp' },
  serverB: { host: 'remote.host', protocol: 'amqp' },
}

function makeSpec({
  serverIds = ['serverA'],
  messageIds = ['MessageA'],
  messagePayloadsPatch,
  serversPatch,
  operationIds,
}: MakeSpecOptions = {}): { asyncapi: string } & Record<string, unknown> {
  const payloads = { ...DEFAULT_PAYLOADS, ...messagePayloadsPatch }
  const servers = { ...DEFAULT_SERVERS, ...serversPatch }

  // Channel-level messages map: { MessageA: { $ref: '#/components/messages/MessageA' }, ... }
  const channelMessages = Object.fromEntries(
    messageIds.map(id => [id, { $ref: `#/components/messages/${id}` }]),
  )

  // Operation messages array: [{ $ref: '#/channels/myChannel/messages/MessageA' }, ...]
  const operationMessages = messageIds.map(id => ({
    $ref: `#/channels/myChannel/messages/${id}`,
  }))

  // Build operations map
  const ops = operationIds ?? ['myOp']
  const operations = Object.fromEntries(
    ops.map(opId => [
      opId,
      {
        action: 'send',
        channel: { $ref: '#/channels/myChannel' },
        messages: operationMessages,
      },
    ]),
  )

  return {
    asyncapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    servers,
    channels: {
      myChannel: {
        servers: serverIds.map(id => ({ $ref: `#/servers/${id}` })),
        messages: channelMessages,
      },
    },
    operations,
    components: {
      messages: Object.fromEntries(
        ['MessageA', 'MessageB'].map(id => [
          id,
          { payload: payloads[id] ?? { type: 'string' } },
        ]),
      ),
    },
  }
}

describe('createPropertyMappingResolver', () => {
  const SYM = Symbol('key')
  const resolver = createPropertyMappingResolver(SYM)
  const mockCtx = {} as never

  const item = (key: string) => ({ [SYM]: key })

  it('maps elements in identical order', () => {
    const before = [item('A'), item('B')]
    const after = [item('A'), item('B')]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [],
      removed: [],
      mapped: { 0: 0, 1: 1 },
    })
  })

  it('maps elements in reversed order', () => {
    const before = [item('A'), item('B')]
    const after = [item('B'), item('A')]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [],
      removed: [],
      mapped: { 0: 1, 1: 0 },
    })
  })

  it('marks new element as added', () => {
    const before = [item('A')]
    const after = [item('A'), item('B')]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [1],
      removed: [],
      mapped: { 0: 0 },
    })
  })

  it('marks missing element as removed', () => {
    const before = [item('A'), item('B')]
    const after = [item('A')]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [],
      removed: [1],
      mapped: { 0: 0 },
    })
  })

  it('treats replaced key (A→B) as removed+added, not mapped', () => {
    const before = [item('A')]
    const after = [item('B')]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [0],
      removed: [0],
      mapped: {},
    })
  })

  it('treats elements without the symbol as unmatched (removed+added)', () => {
    const before = [{}]
    const after = [{}]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [0],
      removed: [0],
      mapped: {},
    })
  })

  it('maps only elements that share the symbol; unmatched go to added/removed', () => {
    const before = [item('A'), item('B')]
    const after = [item('A'), item('C')]
    expect(resolver(before, after, mockCtx)).toEqual({
      added: [1],
      removed: [1],
      mapped: { 0: 0 },
    })
  })
})

describe('firstReferenceKeyProperty retained in merged document if explicitly passed', () => {
  const TEST_FIRST_REF_KEY_PROP = Symbol('test-first-ref-key')

  const COMPARE_OPTIONS: CompareOptions = {
    firstReferenceKeyProperty: TEST_FIRST_REF_KEY_PROP,
  }

  type Doc = Record<PropertyKey, unknown>

  const getMessages = (merged: unknown): Doc[] =>
    (((merged as Doc).operations as Doc)?.myOp as Doc)?.messages as Doc[]

  const getServers = (merged: unknown): Doc[] =>
    (((merged as Doc).channels as Doc)?.myChannel as Doc)?.servers as Doc[]


  describe('messages', () => {
    it('symbol present on matched/modified message merged node', async () => {
      const before = makeSpec({ messageIds: ['MessageA'] })
      const after = makeSpec({
        messageIds: ['MessageA'],
        messagePayloadsPatch: { MessageA: { type: 'integer' } },
      })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)
      const messages = getMessages(merged)
      expect(messages[0][TEST_FIRST_REF_KEY_PROP]).toBe('MessageA')
    })

    it('symbol present on added message node in merged document', async () => {
      const before = makeSpec({ messageIds: ['MessageA'] })
      const after = makeSpec({ messageIds: ['MessageA', 'MessageB'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)
      const messages = getMessages(merged)

      expect(messages[0][TEST_FIRST_REF_KEY_PROP]).toBe('MessageA')
      expect(messages[1][TEST_FIRST_REF_KEY_PROP]).toBe('MessageB')
    })

    it('symbol present on removed message node in merged document', async () => {
      const before = makeSpec({ messageIds: ['MessageA', 'MessageB'] })
      const after = makeSpec({ messageIds: ['MessageA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged, diffs } = apiDiff(before, after, COMPARE_OPTIONS)
      const messages = getMessages(merged)

      expect(messages[0][TEST_FIRST_REF_KEY_PROP]).toBe('MessageA')
      expect(messages[1][TEST_FIRST_REF_KEY_PROP]).toBe('MessageB')
    })
  })

  describe('servers', () => {

    it('symbol present on matched server node in merged document', async () => {
      const before = makeSpec({ serverIds: ['serverA'] })
      const after = makeSpec({ serverIds: ['serverA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)
      const servers = getServers(merged)
      expect(servers[0][TEST_FIRST_REF_KEY_PROP]).toBe('serverA')
    })

    it('symbol present on added server node in merged document', async () => {
      const before = makeSpec({ serverIds: ['serverA'] })
      const after = makeSpec({ serverIds: ['serverA', 'serverB'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)
      const servers = getServers(merged)

      expect(servers[0][TEST_FIRST_REF_KEY_PROP]).toBe('serverA')
      expect(servers[1][TEST_FIRST_REF_KEY_PROP]).toBe('serverB')
    })

    it('symbol present on removed server node in merged document', async () => {
      const before = makeSpec({ serverIds: ['serverA', 'serverB'] })
      const after = makeSpec({ serverIds: ['serverA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)
      const servers = getServers(merged)

      expect(servers[0][TEST_FIRST_REF_KEY_PROP]).toBe('serverA')
      expect(servers[1][TEST_FIRST_REF_KEY_PROP]).toBe('serverB')
    })
  })

  describe('firstReferenceKeyProperty not passed', () => {
    it('symbol absent on merged message when firstReferenceKeyProperty not passed', async () => {
      const before = makeSpec({ messageIds: ['MessageA'] })
      const after = makeSpec({ messageIds: ['MessageA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)
      const messages = getMessages(merged)

      expect(Object.getOwnPropertySymbols(messages[0] as object)).toBeEmpty()
    })

    it('symbol absent on added message when firstReferenceKeyProperty not passed', async () => {
      const before = makeSpec({ messageIds: ['MessageA'] })
      const after = makeSpec({ messageIds: ['MessageA', 'MessageB'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)
      const messages = getMessages(merged)

      expect(messages).toHaveLength(2)
      for (const msg of messages) {
        expect(Object.getOwnPropertySymbols(msg as object)).toBeEmpty()
      }
    })

    it('symbol absent on removed message when firstReferenceKeyProperty not passed', async () => {
      const before = makeSpec({ messageIds: ['MessageA', 'MessageB'] })
      const after = makeSpec({ messageIds: ['MessageA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)
      const messages = getMessages(merged)

      expect(messages).toHaveLength(2)
      for (const msg of messages) {
        expect(Object.getOwnPropertySymbols(msg as object)).toBeEmpty()
      }
    })

    it('symbol absent on merged server when firstReferenceKeyProperty not passed', async () => {
      const before = makeSpec({ serverIds: ['serverA'] })
      const after = makeSpec({ serverIds: ['serverA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)
      const servers = getServers(merged)

      expect(Object.getOwnPropertySymbols(servers[0] as object)).toBeEmpty()
    })

    it('symbol absent on added server when firstReferenceKeyProperty not passed', async () => {
      const before = makeSpec({ serverIds: ['serverA'] })
      const after = makeSpec({ serverIds: ['serverA', 'serverB'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)
      const servers = getServers(merged)

      expect(servers).toHaveLength(2)
      for (const server of servers) {
        expect(Object.getOwnPropertySymbols(server as object)).toBeEmpty()
      }
    })

    it('symbol absent on removed server when firstReferenceKeyProperty not passed', async () => {
      const before = makeSpec({ serverIds: ['serverA', 'serverB'] })
      const after = makeSpec({ serverIds: ['serverA'] })
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)
      const servers = getServers(merged)

      expect(servers).toHaveLength(2)
      for (const server of servers) {
        expect(Object.getOwnPropertySymbols(server as object)).toBeEmpty()
      }
    })
  })
})

describe('messages mapped by firstReferenceKeyProperty ', () => {
  it('reordered operation messages produce no diffs', async () => {
    const before = makeSpec({ messageIds: ['MessageA', 'MessageB'] })
    const after = makeSpec({ messageIds: ['MessageB', 'MessageA'] })
    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    expect(diffs).toBeEmpty()
  })

  it('modified message content with order swapped generates only type replace diffs', async () => {
    const before = makeSpec({
      messageIds: ['MessageA', 'MessageB'],
    })
    const after = makeSpec({
      messageIds: ['MessageB', 'MessageA'],
      messagePayloadsPatch: { MessageA: { type: 'integer' } },
    })
    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    // diffs for MessageA in 3 scopes are reported only
    const COMPONENTS_MESSAGE_A_PAYLOAD_TYPE_PATH = ['components', 'messages', 'MessageA', 'payload', 'type']
    const TYPE_CHANGE_DIFF = {
      beforeDeclarationPaths: [COMPONENTS_MESSAGE_A_PAYLOAD_TYPE_PATH],
      afterDeclarationPaths: [COMPONENTS_MESSAGE_A_PAYLOAD_TYPE_PATH],
      action: DiffAction.replace,
      beforeValue: 'string',
      afterValue: 'integer',
    }
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        ...TYPE_CHANGE_DIFF,
        scope: COMPARE_SCOPE_ROOT,
      }),
      expect.objectContaining({
        ...TYPE_CHANGE_DIFF,
        scope: COMPARE_SCOPE_COMPONENTS,
      }),
      expect.objectContaining({
        ...TYPE_CHANGE_DIFF,
        scope: COMPARE_SCOPE_SEND,
      }),
    ]))
  })
})

describe('servers mapped by key', () => {
  it('reordered servers produce no diffs', async () => {
    const before = makeSpec({ serverIds: ['serverA', 'serverB'] })
    const after = makeSpec({ serverIds: ['serverB', 'serverA'] })
    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    expect(diffs).toBeEmpty()
  })

  it('modified server content with order swapped generates only replace diffs', async () => {
    const before = makeSpec({
      serverIds: ['serverA', 'serverB'],
    })
    const after = makeSpec({
      serverIds: ['serverB', 'serverA'],
      serversPatch: {
        serverB: { host: 'remote.changed', protocol: 'amqp' },
      },
    })

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    const HOST_CHANGE_DIFF = {
      beforeValue: 'remote.host',
      afterValue: 'remote.changed',
      action: DiffAction.replace,
      afterDeclarationPaths: [['servers', 'serverB', 'host']],
      beforeDeclarationPaths: [['servers', 'serverB', 'host']],
    }
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        ...HOST_CHANGE_DIFF,
        scope: COMPARE_SCOPE_ROOT,
      }),
      expect.objectContaining({
        ...HOST_CHANGE_DIFF,
        scope: COMPARE_SCOPE_SEND,
      }),
    ]))
  })
})

describe('operations mapped by key', () => {
  it('reordered operations produce no diffs', async () => {
    const before = makeSpec({ operationIds: ['opA', 'opB'] })
    const after = makeSpec({ operationIds: ['opA', 'opB'] })
    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    expect(diffs).toBeEmpty()
  })

  it('modified operation combined with changing operations order generates only replace diffs', async () => {
    const before = makeSpec({ operationIds: ['opA', 'opB'] })
    const after = makeSpec({ operationIds: ['opB', 'opA'] })

      ; (after as any).operations.opB.description = 'changed description'

    await parseAsyncApiAndAssertValid(before)
    await parseAsyncApiAndAssertValid(after)

    const { diffs } = apiDiff(before, after)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        afterValue: "changed description",
        action: "add",
        afterDeclarationPaths: [
          [
            "operations",
            "opB",
            "description",
          ],
        ],
        scope: "send",
      }),
    ]))
  })
})
