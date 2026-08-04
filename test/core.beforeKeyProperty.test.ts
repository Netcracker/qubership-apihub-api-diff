import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { OpenAPIV3 } from 'openapi-types'

import { apiDiff, CompareOptions } from '../src'
import { parseAsyncApiAndAssertValid, resolved } from './helper/asyncapi'

// `beforeKeyProperty` publishes api-diff's mapping decision on the merged document:
// every mapped node carries its before-key, so absence of the symbol means exactly
// one thing - the node was not mapped (it was added, or it is a removed node adopted
// from the before document).

const BEFORE_KEY_PROPERTY = Symbol('test-before-key')

const COMPARE_OPTIONS: CompareOptions = {
  beforeKeyProperty: BEFORE_KEY_PROPERTY,
}

/**
 * api-diff attaches its metadata under symbol keys, which the spec types do not describe.
 * Read it through this one accessor so the rest of the test stays on the spec types.
 */
const beforeKeyOf = (node: object): unknown => (node as Record<symbol, unknown>)[BEFORE_KEY_PROPERTY]

const makeAsyncApiSpec = (messageIds: string[]): AsyncAPIV3.AsyncAPIObject => ({
  asyncapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  channels: {
    myChannel: {
      address: 'my/channel',
      messages: Object.fromEntries(
        messageIds.map(id => [id, { $ref: `#/components/messages/${id}` }]),
      ),
    },
  },
  operations: {
    myOp: {
      action: 'send',
      channel: { $ref: '#/channels/myChannel' },
      messages: messageIds.map(id => ({ $ref: `#/channels/myChannel/messages/${id}` })),
    },
  },
  components: {
    messages: {
      MessageA: { payload: { type: 'string' } },
      MessageB: { payload: { type: 'integer' } },
    },
  },
})

const getChannel = (merged: unknown): AsyncAPIV3.ChannelObject =>
  resolved((merged as AsyncAPIV3.AsyncAPIObject).channels?.myChannel)

const getChannelMessages = (merged: unknown): AsyncAPIV3.MessagesObject =>
  resolved(getChannel(merged).messages)

const getChannelMessage = (merged: unknown, messageId: string): AsyncAPIV3.MessageObject =>
  resolved(getChannelMessages(merged)[messageId])

const getOperation = (merged: unknown): AsyncAPIV3.OperationObject =>
  resolved((merged as AsyncAPIV3.AsyncAPIObject).operations?.myOp)

const getOperationMessages = (merged: unknown): Array<AsyncAPIV3.MessageObject | AsyncAPIV3.ReferenceObject> =>
  resolved(getOperation(merged).messages)

const getOperationMessage = (merged: unknown, index: number): AsyncAPIV3.MessageObject =>
  resolved(getOperationMessages(merged)[index])

describe('beforeKeyProperty', () => {
  describe('option passed', () => {
    it('mapped node carries its own key when the key did not change', async () => {
      const before = makeAsyncApiSpec(['MessageA'])
      const after = makeAsyncApiSpec(['MessageA'])
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)

      expect(beforeKeyOf(getChannel(merged))).toBe('myChannel')
      expect(beforeKeyOf(getOperation(merged))).toBe('myOp')
      expect(beforeKeyOf(getChannelMessage(merged, 'MessageA'))).toBe('MessageA')
    })

    it('added node carries no before-key', async () => {
      const before = makeAsyncApiSpec(['MessageA'])
      const after = makeAsyncApiSpec(['MessageA', 'MessageB'])
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)

      expect(beforeKeyOf(getChannelMessage(merged, 'MessageA'))).toBe('MessageA')
      expect(beforeKeyOf(getChannelMessage(merged, 'MessageB'))).toBeUndefined()
    })

    it('removed node carries no before-key', async () => {
      const before = makeAsyncApiSpec(['MessageA', 'MessageB'])
      const after = makeAsyncApiSpec(['MessageA'])
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)

      expect(beforeKeyOf(getChannelMessage(merged, 'MessageA'))).toBe('MessageA')
      expect(beforeKeyOf(getChannelMessage(merged, 'MessageB'))).toBeUndefined()
    })

    it('mapped node carries the before-key when the key changed', () => {
      // No AsyncAPI map remaps object keys today, so the changed-key half of the contract is
      // exercised through OpenAPI: `pathMappingResolver` unifies path parameter names, so these
      // two paths map onto each other under different keys - the merged node is keyed by the
      // after path.
      const makeOpenApiSpec = (pathKey: string, paramName: string): OpenAPIV3.Document => ({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          [pathKey]: {
            get: {
              parameters: [{ name: paramName, in: 'path', required: true, schema: { type: 'string' } }],
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      })
      const before = makeOpenApiSpec('/pets/{id}', 'id')
      const after = makeOpenApiSpec('/pets/{petId}', 'petId')

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)
      const paths = (merged as OpenAPIV3.Document).paths

      expect(Object.keys(paths)).toEqual(['/pets/{petId}'])
      expect(beforeKeyOf(paths['/pets/{petId}']!)).toBe('/pets/{id}')
    })
  })

  describe('merged arrays', () => {
    // An array is a mapped node like any other, so it carries its before-key too - unlike
    // `firstReferenceKeyProperty`, which belongs to each element and is skipped on containers.

    it('array container carries its own key', async () => {
      const before = makeAsyncApiSpec(['MessageA'])
      const after = makeAsyncApiSpec(['MessageA'])
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)

      expect(beforeKeyOf(getOperationMessages(merged))).toBe('messages')
    })

    it('element carries its numeric before-key, which is also its merged index', async () => {
      // `operationRules()['/messages']` maps by first reference key, so reordering maps
      // before index 0 onto after index 1 and vice versa. A merged array is keyed by the
      // BEFORE index, so an element's before-key always equals its own merged index and
      // never reveals the after index - which is why locating an entity across versions
      // needs a map container, not an array.
      const before = makeAsyncApiSpec(['MessageA', 'MessageB'])
      const after = makeAsyncApiSpec(['MessageB', 'MessageA'])
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)

      expect(getOperationMessages(merged)).toHaveLength(2) // both mapped, neither added nor removed
      expect(beforeKeyOf(getOperationMessage(merged, 0))).toBe(0)
      expect(beforeKeyOf(getOperationMessage(merged, 1))).toBe(1)
    })

    it('added element carries no before-key', async () => {
      const before = makeAsyncApiSpec(['MessageA'])
      const after = makeAsyncApiSpec(['MessageA', 'MessageB'])
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after, COMPARE_OPTIONS)

      expect(getOperationMessages(merged)).toHaveLength(2) // MessageA mapped, MessageB added
      expect(beforeKeyOf(getOperationMessage(merged, 0))).toBe(0)
      expect(beforeKeyOf(getOperationMessage(merged, 1))).toBeUndefined()
    })
  })

  describe('option not passed', () => {
    it('no before-key property is written', async () => {
      const before = makeAsyncApiSpec(['MessageA'])
      const after = makeAsyncApiSpec(['MessageA', 'MessageB'])
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)

      const { merged } = apiDiff(before, after)

      expect(beforeKeyOf(getChannel(merged))).toBeUndefined()
      expect(beforeKeyOf(getChannelMessage(merged, 'MessageA'))).toBeUndefined()
      expect(Object.getOwnPropertySymbols(getChannelMessage(merged, 'MessageA'))).toBeEmpty()
    })
  })
})
