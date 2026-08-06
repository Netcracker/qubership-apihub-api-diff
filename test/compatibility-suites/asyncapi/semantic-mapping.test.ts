import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'

import {
  aggregateDiffsWithRollup,
  annotation,
  apiDiff,
  Diff,
  DiffAction,
  DIFF_META_KEY,
  DIFFS_AGGREGATED_META_KEY,
  nonBreaking,
  unclassified,
} from '../../../src'
import { COMPARE_SCOPE_ROOT, CompareOptions, CompareResult } from '../../../src/types'
import { COMPARE_SCOPE_COMPONENTS, COMPARE_SCOPE_SEND } from '../../../src/asyncapi'
import { isObject } from '../../../src/utils'
import { loadAsyncApiSuiteCase } from '../../helper/asyncapi'
import { diffsMatcher } from '../../helper/matchers'
import { compareFiles, compareFilesWithMerge } from '../utils'

const SUITE_ID = 'semantic-mapping'

// The corpus baseline: two channels share the `order-events` address - which is why the generator
// emitted hashed ids in the first place - each with one message whose payload is
// `components/schemas/OrderEvent`. Only the second channel's message id carries a hash that flips.
const HASHED_CHANNEL_ID = 'orderEvents_1001'
const PLAIN_CHANNEL_ID = 'orderEvents'
const HASHED_OPERATION_ID = 'sendOrderEvent_1001'
const BEFORE_MESSAGE_ID = 'OrderEvent_1001'
const AFTER_MESSAGE_ID = 'OrderEvent_2002'
const CHANNEL_MESSAGES_PATH = ['channels', HASHED_CHANNEL_ID, 'messages']

const BEFORE_KEY_PROPERTY = Symbol('test-before-key')

const compare = (testId: string, override?: CompareOptions): Promise<Diff[]> =>
  compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_ASYNC_API, undefined, override)

/**
 * Compares a corpus case *without* stripping `components`, which `compareFiles` does. Used only
 * where the assertion is about a node being reachable from both `components/messages` and a
 * channel - the stripped comparison has no second map to check against.
 */
const diffWholeDocument = (testId: string, override?: CompareOptions): CompareResult => {
  const { before, after } = loadAsyncApiSuiteCase(SUITE_ID, testId)
  return apiDiff(before, after, { unify: true, ...override })
}

const declarationPathsOf = (diff: Diff): JsonPath[] => [
  ...('beforeDeclarationPaths' in diff ? diff.beforeDeclarationPaths : []),
  ...('afterDeclarationPaths' in diff ? diff.afterDeclarationPaths : []),
]

const startsWith = (path: JsonPath, prefix: readonly string[]): boolean =>
  prefix.every((segment, index) => path[index] === segment)

const underChannelMessages = (diffs: Diff[]): Diff[] =>
  diffs.filter(diff => declarationPathsOf(diff).some(path => startsWith(path, CHANNEL_MESSAGES_PATH)))

const wholeEntityDiffs = (diffs: Diff[]): Diff[] =>
  diffs.filter(diff => diff.action === DiffAction.add || diff.action === DiffAction.remove)

type Node = Record<PropertyKey, unknown>

/**
 * Walks a merged document down `path` and returns the node there, asserting at every step that
 * what it found is an object.
 *
 * The assertions are the point: these tests read symbol metadata off deep nodes, and a silent
 * `undefined` from one wrong segment would turn a real regression into a passing
 * `expect(...).toBeUndefined()`. Failing at the segment that went missing names the problem
 * instead. Returns `Node` rather than a spec type because what is read off the node - the
 * before-key, the diff-meta record - is symbol-keyed and outside the spec types entirely.
 */
const at = (root: unknown, ...path: string[]): Node => {
  let value: unknown = root
  for (const segment of path) {
    expect(isObject(value)).toBe(true)
    value = (value as Node)[segment]
  }
  expect(isObject(value)).toBe(true)
  return value as Node
}

const beforeKeyOf = (node: Node): unknown => node[BEFORE_KEY_PROPERTY]

describe('AsyncAPI semantic entity mapping', () => {
  describe('an id flip alone is not a change', () => {
    // Each of these flips one or more generated ids and changes nothing a consumer can observe,
    // so the whole comparison must come out empty - including any `rename`, whose classifier slot
    // is shared with `replace` and would report the pair as a real change.

    it.each([
      ['message-id-changed', 'the message id'],
      ['channel-id-changed', 'the channel id'],
      ['operation-id-changed', 'the operation id'],
      ['all-ids-changed', 'all three ids at once'],
      ['message-id-changed-in-multi-message-operation', 'both message ids of one operation'],
      ['message-id-changed-in-operation-reply', 'a reply message id'],
    ])('%s reports nothing when %s flips', async testId => {
      expect(await compare(testId)).toBeEmpty()
    })

    it('message-id-renamed-manually reports nothing either', async () => {
      // A deliberate, hand-written rename with unchanged semantics is indistinguishable from a
      // generated one and is silenced too. None of these ids is part of the wire contract - the
      // address and the payload are - but this is a behaviour change worth a release note.
      expect(await compare('message-id-renamed-manually')).toBeEmpty()
    })
  })

  describe('a real change alongside an id flip is still reported', () => {
    it('message-id-changed-with-description reports only the description change', async () => {
      const diffs = await compare('message-id-changed-with-description')

      // The description edit is what made the generator re-hash the id, so this is the
      // real-world case: one annotation per path the shared message is reachable from, and no
      // add or remove anywhere.
      expect(diffs).toHaveLength(3)
      expect(wholeEntityDiffs(diffs)).toBeEmpty()
      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          type: annotation,
          scope: COMPARE_SCOPE_ROOT,
          afterDeclarationPaths: [['components', 'messages', AFTER_MESSAGE_ID, 'description']],
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          type: annotation,
          scope: COMPARE_SCOPE_SEND,
          afterDeclarationPaths: [['components', 'messages', AFTER_MESSAGE_ID, 'description']],
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          type: annotation,
          scope: COMPARE_SCOPE_SEND,
          afterDeclarationPaths: [[...CHANNEL_MESSAGES_PATH, AFTER_MESSAGE_ID, 'description']],
        }),
      ]))
    })

    it('message-id-changed-with-payload reports the payload change, not a remove and add', async () => {
      const diffs = await compare('message-id-changed-with-payload')

      // The case content-equality matching would get wrong: the payload changed *and* the id
      // flipped, and matching on the payload's declaration path still pairs the two messages, so
      // the change surfaces inside the payload instead of as a whole-message replacement.
      expect(diffs).toHaveLength(2) // the added property, in two scopes
      expect(wholeEntityDiffs(diffs).filter(diff => underChannelMessages([diff]).length > 0)).toBeEmpty()
      expect(diffs).toEqual(diffsMatcher([
        ...[COMPARE_SCOPE_ROOT, COMPARE_SCOPE_SEND].map(scope => expect.objectContaining({
          action: DiffAction.add,
          type: nonBreaking,
          scope,
          afterDeclarationPaths: [['components', 'schemas', 'OrderEvent', 'properties', 'orderId']],
        })),
      ]))
    })

    it('message-id-changed-and-message-removed reports only the genuine removal', async () => {
      const diffs = await compare('message-id-changed-and-message-removed')

      // Three: the message itself in two scopes, plus the operation that referenced it. Every one
      // of them is about `OrderCancelled` - the flipped message is matched and reports nothing.
      expect(diffs).toHaveLength(3)
      expect(diffs.every(diff => diff.action === DiffAction.remove)).toBe(true)
      expect(diffs).toEqual(diffsMatcher([
        ...[COMPARE_SCOPE_ROOT, COMPARE_SCOPE_SEND].map(scope => expect.objectContaining({
          action: DiffAction.remove,
          type: unclassified,
          scope,
          beforeDeclarationPaths: [['channels', PLAIN_CHANNEL_ID, 'messages', 'OrderCancelled']],
        })),
        expect.objectContaining({
          action: DiffAction.remove,
          scope: COMPARE_SCOPE_ROOT,
          beforeDeclarationPaths: [['operations', 'sendOrderCancelled']],
        }),
      ]))
    })

    it('message-id-changed-and-message-added reports only the genuine addition', async () => {
      const diffs = await compare('message-id-changed-and-message-added')

      // Mirror of the removal case: the message in two scopes plus the operation referencing it.
      expect(diffs).toHaveLength(3)
      expect(diffs.every(diff => diff.action === DiffAction.add)).toBe(true)
      expect(diffs).toEqual(diffsMatcher([
        ...[COMPARE_SCOPE_ROOT, COMPARE_SCOPE_SEND].map(scope => expect.objectContaining({
          action: DiffAction.add,
          type: unclassified,
          scope,
          afterDeclarationPaths: [['channels', PLAIN_CHANNEL_ID, 'messages', 'OrderCancelled']],
        })),
        expect.objectContaining({
          action: DiffAction.add,
          scope: COMPARE_SCOPE_ROOT,
          afterDeclarationPaths: [['operations', 'sendOrderCancelled']],
        }),
      ]))
    })
  })

  describe('an entity with no semantic identity keeps the old behaviour', () => {
    it('message-id-changed-with-inline-payload reports remove and add', async () => {
      const diffs = await compare('message-id-changed-with-inline-payload')

      // An inline payload declares under `components/messages/<hashedId>/payload`, which embeds
      // the very id we are trying to look past, so there is no stable anchor and the message is
      // deliberately left unmatched. Same six diffs the option-off run produces.
      expect(diffs).toHaveLength(6)
      expect(wholeEntityDiffs(diffs)).toHaveLength(6)
    })
  })

  describe('an ambiguous group pairs deterministically', () => {
    it('both-channel-ids-changed pairs by the tie-break and says so via beforeKeyProperty', async () => {
      const { diffs, merged } = await compareFilesWithMerge(
        SUITE_ID, 'both-channel-ids-changed', TEST_SPEC_TYPE_ASYNC_API, undefined,
        { beforeKeyProperty: BEFORE_KEY_PROPERTY },
      )

      // Both channels sit on one address with one `components/schemas/OrderEvent` message each,
      // so they share an identity exactly. Refusing to pair would reproduce the remove+add noise
      // this feature removes, so they pair 1-1 in tie-break order over the raw source key:
      // sorted before keys against sorted after keys.
      const channels = at(merged, 'channels')
      expect(beforeKeyOf(at(channels, 'orderEvents_2002'))).toBe('orderEvents')
      expect(beforeKeyOf(at(channels, 'orderEvents_3003'))).toBe('orderEvents_1001')

      // That pairing is the "wrong" one semantically - `orderEvents_3003` was `orderEvents` - and
      // the cost is exactly what D6 accepts: the two descriptions read as swapped rather than as
      // two channels removed and two added.
      expect(wholeEntityDiffs(diffs)).toBeEmpty()
      expect(diffs).toHaveLength(4) // two channel descriptions and two message descriptions
      expect(diffs.every(diff => diff.type === annotation)).toBe(true)
    })
  })

  describe('the option is an escape hatch', () => {
    it('reports remove and add for the same pair when semantic mapping is off', async () => {
      const diffs = await compare('message-id-changed', { asyncApiSemanticEntityMapping: false })
      const channelMessageDiffs = underChannelMessages(diffs)

      // Six in total: the message is reachable at `channels.*.messages` in two scopes and at
      // `operations.*.messages[0]` in one, and each reports the flip as a whole-entity removal
      // plus a whole-entity addition. This is what the option rescues.
      expect(diffs).toHaveLength(6)
      expect(channelMessageDiffs).toHaveLength(4)
      expect(channelMessageDiffs).toEqual(diffsMatcher([
        ...[COMPARE_SCOPE_ROOT, COMPARE_SCOPE_SEND].flatMap(scope => [
          expect.objectContaining({
            action: DiffAction.remove,
            type: unclassified,
            scope,
            beforeDeclarationPaths: [[...CHANNEL_MESSAGES_PATH, BEFORE_MESSAGE_ID]],
          }),
          expect.objectContaining({
            action: DiffAction.add,
            type: unclassified,
            scope,
            afterDeclarationPaths: [[...CHANNEL_MESSAGES_PATH, AFTER_MESSAGE_ID]],
          }),
        ]),
      ]))
    })

    it('changes nothing when the key-based mapping already matched everything', async () => {
      // The isolation guarantee: the semantic pass never runs unless a map holds both an addition
      // and a removal. `no-ids-changed` is the same description edit as
      // `message-id-changed-with-description` *without* the id flip, so every key still matches
      // and the result must be identical whether the option is on or off.
      const on = await compare('no-ids-changed')
      const off = await compare('no-ids-changed', { asyncApiSemanticEntityMapping: false })

      expect(on).not.toBeEmpty() // otherwise the comparison proves nothing
      expect(on).toEqual(off)
    })
  })

  describe('beforeKeyProperty publishes the mapping decision', () => {
    const mergedWithBeforeKeys = (testId: string): Promise<unknown> =>
      compareFilesWithMerge(
        SUITE_ID, testId, TEST_SPEC_TYPE_ASYNC_API, undefined, { beforeKeyProperty: BEFORE_KEY_PROPERTY },
      ).then(result => result.merged)

    it('records the before-key of a semantically matched node', async () => {
      const merged = await mergedWithBeforeKeys('message-id-changed')
      const messages = at(merged, 'channels', HASHED_CHANNEL_ID, 'messages')

      expect(beforeKeyOf(at(messages, AFTER_MESSAGE_ID))).toBe(BEFORE_MESSAGE_ID)
    })

    it('leaves base-matched nodes undecorated', async () => {
      // Their merged key already is their before-key, so there is nothing to record. Writing it
      // anyway would decorate every merged object in the document, which any consumer walking
      // values generically then has to know to skip.
      const merged = await mergedWithBeforeKeys('message-id-changed')

      expect(beforeKeyOf(at(merged, 'channels', PLAIN_CHANNEL_ID))).toBeUndefined()
      expect(beforeKeyOf(at(merged, 'operations', HASHED_OPERATION_ID))).toBeUndefined()
    })

    it('records no before-key on an added node', async () => {
      const merged = await mergedWithBeforeKeys('message-id-changed-and-message-added')
      const messages = at(merged, 'channels', PLAIN_CHANNEL_ID, 'messages')

      expect(beforeKeyOf(at(messages, 'OrderCancelled'))).toBeUndefined()
    })

    it('records the same before-key whichever map the shared message is reached by', () => {
      // `mergedJsoCache`'s footprint excludes keys, so a shared object pair records whichever
      // traversal arrived first. The keys agree across paths here, and this pins that.
      //
      // Compared whole rather than through `compareFiles`, which strips `components` - the second
      // map the message lives in. The other path, `operations.*.messages[]`, is an array, whose
      // elements carry a numeric before-key by design, so it is not a second map.
      const { merged } = diffWholeDocument('message-id-changed', { beforeKeyProperty: BEFORE_KEY_PROPERTY })

      expect(beforeKeyOf(at(merged, 'channels', HASHED_CHANNEL_ID, 'messages', AFTER_MESSAGE_ID)))
        .toBe(BEFORE_MESSAGE_ID)
      expect(beforeKeyOf(at(merged, 'components', 'messages', AFTER_MESSAGE_ID)))
        .toBe(BEFORE_MESSAGE_ID)
    })
  })

  describe('the shared-diff contract survives semantic matching', () => {
    it('attaches only Diff instances that are also in the reported list', () => {
      // A `Diff` is unique per (value pair, declaration paths, scope), so one entity reached in
      // two scopes legitimately yields two instances - `components.messages.X.description` is
      // reported once in `components` and once in `root`. What must never happen is a diff
      // attached to the merged tree that is a *copy* of a reported one: that is what semantically
      // matching a shared node could break, and it would silently double every changelog entry.
      const { diffs, merged } = diffWholeDocument('message-id-changed-with-description')
      // Rolls every `DIFF_META_KEY` record in the tree up to the root and hands back the union,
      // which is the set this needs. Same traversal api-processor runs on a merged document, so
      // the contract is checked the way a consumer actually walks it. It writes the aggregate onto
      // the tree, which is harmless here - `merged` is local to this test.
      const attached = aggregateDiffsWithRollup(merged, DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY) ?? new Set()

      expect(attached.size).toBeGreaterThan(0)
      for (const diff of attached) {
        expect(diffs).toContain(diff) // identity, not equality
      }
    })

    it('reports the shared message once per scope and declaration path, no more', () => {
      const { diffs } = diffWholeDocument('message-id-changed-with-description')

      // One description edit on one message object. A `Diff` is unique per (value pair,
      // declaration paths, scope), so the expected fan-out is: the `components` declaration path
      // in all three scopes, plus the channel declaration path in `send`. Anything above that
      // means the shared message was cloned apart by the semantic match.
      expect(diffs).toHaveLength(4)
      expect(new Set(diffs.map(diff => diff.scope))).toEqual(
        new Set([COMPARE_SCOPE_ROOT, COMPARE_SCOPE_SEND, COMPARE_SCOPE_COMPONENTS]),
      )
      expect(diffs.filter(diff => diff.scope === COMPARE_SCOPE_SEND)).toHaveLength(2)
    })
  })
})
