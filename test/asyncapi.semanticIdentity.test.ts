import type { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { normalize } from '@netcracker/qubership-apihub-api-unifier'

import { formatSemanticIdentity, logicalIndexOf, payloadIdentity } from '../src/asyncapi/asyncapi3.identity'
import { loadValidAsyncApiSuiteCase, parseAsyncApiAndAssertValid, resolved } from './helper/asyncapi'
import { TEST_DEFAULTS_FLAG, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from './helper'

// Mirrors the normalization `compare()` performs, so these unit tests see the same tree the
// mapping resolvers do.
const NORMALIZE_OPTIONS = {
  validate: true,
  liftCombiners: true,
  unify: true,
  allowNotValidSyntheticChanges: true,
  originsFlag: TEST_ORIGINS_FLAG,
  defaultsFlag: TEST_DEFAULTS_FLAG,
  syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
}

const normalizeDocument = (source: unknown): AsyncAPIV3.AsyncAPIObject =>
  normalize(source, { ...NORMALIZE_OPTIONS, source }) as AsyncAPIV3.AsyncAPIObject

const channelMessage = (
  document: AsyncAPIV3.AsyncAPIObject,
  channelId: string,
  messageId: string,
): AsyncAPIV3.MessageObject =>
  resolved(resolved(resolved(document.channels?.[channelId]).messages)[messageId])

const SUITE_ID = 'semantic-mapping'
const SAMPLE_CHANNEL_ID = 'orderEvents_1001'
const SAMPLE_PAYLOAD_IDENTITY = 'components/schemas/OrderEvent'

describe('payloadIdentity', () => {
  it('anchors a $ref payload on the schema declaration path, unchanged by an id flip', async () => {
    const sample = await loadValidAsyncApiSuiteCase(SUITE_ID, 'message-id-changed')
    const before = normalizeDocument(sample.before)
    const after = normalizeDocument(sample.after)

    // Same message, two different generated ids - the whole point of the feature.
    const beforeMessage = channelMessage(before, SAMPLE_CHANNEL_ID, 'OrderEvent_1001')
    const afterMessage = channelMessage(after, SAMPLE_CHANNEL_ID, 'OrderEvent_2002')

    expect(payloadIdentity(beforeMessage, TEST_ORIGINS_FLAG)).toBe(SAMPLE_PAYLOAD_IDENTITY)
    expect(payloadIdentity(afterMessage, TEST_ORIGINS_FLAG)).toBe(SAMPLE_PAYLOAD_IDENTITY)
  })

  it('returns undefined for an inline payload', async () => {
    // Declares under `components/messages/M/payload`, which embeds the message id - the very
    // thing the identity exists to look past - so it is not a usable anchor.
    const source = makeSpec({ payload: { type: 'object', properties: { a: { type: 'string' } } } })
    await parseAsyncApiAndAssertValid(source)

    const message = channelMessage(normalizeDocument(source), 'ch', 'M')

    expect(payloadIdentity(message, TEST_ORIGINS_FLAG)).toBeUndefined()
  })

  it('returns undefined for a payload whose properties are all normalization defaults', async () => {
    const source = makeSpec({ payload: {} })
    await parseAsyncApiAndAssertValid(source)

    const message = channelMessage(normalizeDocument(source), 'ch', 'M')

    expect(payloadIdentity(message, TEST_ORIGINS_FLAG)).toBeUndefined()
  })

  it('throws when the message carries no origins record under the given flag', async () => {
    const source = makeSpec({ payload: { $ref: '#/components/schemas/S' } })
    await parseAsyncApiAndAssertValid(source)

    const message = channelMessage(normalizeDocument(source), 'ch', 'M')
    const wrongFlag = Symbol('not-the-origins-flag')

    // A wrong flag (or an un-normalized document) is a programming error, not a data condition:
    // collapsing it into `undefined` would look exactly like an inline payload.
    expect(() => payloadIdentity(message, wrongFlag)).toThrow(/no origins record/)
    expect(payloadIdentity(message, TEST_ORIGINS_FLAG)).toBe('components/schemas/S')
  })
})

describe('formatSemanticIdentity', () => {
  it('returns a single segment unchanged, so a payload identity stays readable', () => {
    expect(formatSemanticIdentity([SAMPLE_PAYLOAD_IDENTITY])).toBe(SAMPLE_PAYLOAD_IDENTITY)
  })

  it('joins segments with a pipe', () => {
    expect(formatSemanticIdentity(['send', 'order-events', SAMPLE_PAYLOAD_IDENTITY]))
      .toBe(`send|order-events|${SAMPLE_PAYLOAD_IDENTITY}`)
  })

  it('is injective across segment lists', () => {
    // A separator that can occur inside a segment - a space, say, which both an address and a
    // schema name may contain - would collapse these two onto the same string.
    expect(formatSemanticIdentity(['send a', 'b'])).not.toBe(formatSemanticIdentity(['send', 'a b']))
  })

  it('throws when a segment contains the separator', () => {
    // Injectivity rests on this throw rather than on the separator being impossible, so a segment
    // that does contain one must fail loudly instead of producing a colliding identity.
    expect(() => formatSemanticIdentity(['send', 'a|b'])).toThrow(/must not contain the separator/)
  })

  it('returns an empty identity for no segments', () => {
    expect(formatSemanticIdentity([])).toBe('')
  })
})

describe('logicalIndexOf', () => {
  const HASHED_CHANNEL_ID = 'orderEvents_1001'
  const PLAIN_CHANNEL_ID = 'orderEvents'
  const ADDRESS = 'order-events'
  const HASHED_OPERATION_ID = 'sendOrderEvent_1001'
  const PLAIN_OPERATION_ID = 'sendOrderEvent'

  /** Mirrors the serialization of `formatSemanticIdentity`, pinning the wire form it produces. */
  const identity = (...segments: string[]): string => segments.join('|')

  // Validated once - every case in this block reads the same before-document.
  let sample: AsyncAPIV3.AsyncAPIObject
  beforeAll(async () => {
    sample = (await loadValidAsyncApiSuiteCase(SUITE_ID, 'message-id-changed')).before
  })

  const sampleDocument = (): AsyncAPIV3.AsyncAPIObject => normalizeDocument(sample)

  const channel = (document: AsyncAPIV3.AsyncAPIObject, channelId: string): AsyncAPIV3.ChannelObject =>
    resolved(document.channels?.[channelId])

  const operation = (document: AsyncAPIV3.AsyncAPIObject, operationId: string): AsyncAPIV3.OperationObject =>
    resolved(document.operations?.[operationId])

  const componentMessage = (
    document: AsyncAPIV3.AsyncAPIObject,
    messageId: string,
  ): AsyncAPIV3.MessageObject => resolved(document.components?.messages?.[messageId])

  it('identifies an operation by action, address and its messages payloads', () => {
    const document = sampleDocument()
    const index = logicalIndexOf(document, TEST_ORIGINS_FLAG)

    expect(index.identityOfOperation(operation(document, HASHED_OPERATION_ID)))
      .toBe(identity('send', ADDRESS, SAMPLE_PAYLOAD_IDENTITY))
  })

  it('identifies a channel by address and its messages payloads', () => {
    const document = sampleDocument()
    const index = logicalIndexOf(document, TEST_ORIGINS_FLAG)

    expect(index.identityOfChannel(channel(document, HASHED_CHANNEL_ID)))
      .toBe(identity(ADDRESS, SAMPLE_PAYLOAD_IDENTITY))
  })

  it('identifies a components message by the referencing operations action and address', () => {
    const document = sampleDocument()
    const index = logicalIndexOf(document, TEST_ORIGINS_FLAG)

    expect(index.identityOfMessage(componentMessage(document, 'OrderEvent_1001')))
      .toBe(identity('send', ADDRESS, SAMPLE_PAYLOAD_IDENTITY))
  })

  it('gives the two same-address entities the same identity', () => {
    // This is the ambiguous group the sample exists to produce: the two channels (and the two
    // operations on them) differ only by description, so by the stated identity criterion they
    // are consumer-equivalent.
    const document = sampleDocument()
    const index = logicalIndexOf(document, TEST_ORIGINS_FLAG)

    expect(index.identityOfChannel(channel(document, PLAIN_CHANNEL_ID)))
      .toBe(index.identityOfChannel(channel(document, HASHED_CHANNEL_ID)))
    expect(index.identityOfOperation(operation(document, PLAIN_OPERATION_ID)))
      .toBe(index.identityOfOperation(operation(document, HASHED_OPERATION_ID)))
  })

  it('is memoized per root, so the walk happens once', () => {
    const document = sampleDocument()

    expect(logicalIndexOf(document, TEST_ORIGINS_FLAG)).toBe(logicalIndexOf(document, TEST_ORIGINS_FLAG))
  })

  it('rebuilds for a different origins flag rather than answering from another documents origins', () => {
    const document = sampleDocument()

    expect(logicalIndexOf(document, TEST_ORIGINS_FLAG))
      .not.toBe(logicalIndexOf(document, Symbol('other-origins')))
  })

  it('checks action and address at runtime rather than trusting the spec types', () => {
    // The spec types mark `action` and `channel` required, but api-diff also compares
    // intentionally invalid and partial documents.
    const index = logicalIndexOf({}, TEST_ORIGINS_FLAG)

    expect(index.identityOfOperation({ channel: { address: 'a' } })).toBeUndefined()
    expect(index.identityOfOperation({ action: 'send' })).toBeUndefined()
    expect(index.identityOfChannel({})).toBeUndefined()
  })

  it('gives no identity when any message of a container has no payload identity', () => {
    // A partial message set could pair two channels that merely share an address and one message.
    const source = {
      asyncapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      channels: {
        ch: {
          address: 'a',
          messages: {
            Ref: { $ref: '#/components/messages/Ref' },
            Inline: { $ref: '#/components/messages/Inline' },
          },
        },
      },
      components: {
        schemas: { S: { type: 'object' } },
        messages: {
          Ref: { payload: { $ref: '#/components/schemas/S' } },
          Inline: { payload: { type: 'string' } },
        },
      },
    }
    const document = normalizeDocument(source)
    const index = logicalIndexOf(document, TEST_ORIGINS_FLAG)

    expect(index.identityOfChannel(channel(document, 'ch'))).toBeUndefined()
  })
})

function makeSpec({ payload }: { payload: unknown }): { asyncapi: string } & Record<string, unknown> {
  return {
    asyncapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    channels: {
      ch: { address: 'a', messages: { M: { $ref: '#/components/messages/M' } } },
    },
    operations: {
      op: {
        action: 'send',
        channel: { $ref: '#/channels/ch' },
        messages: [{ $ref: '#/channels/ch/messages/M' }],
      },
    },
    components: {
      schemas: { S: { type: 'object', properties: { a: { type: 'string' } } } },
      messages: { M: { payload } },
    },
  }
}
