import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'

import { Diff, DiffAction, unclassified } from '../../../src'
import { COMPARE_SCOPE_ROOT } from '../../../src/types'
import { COMPARE_SCOPE_SEND } from '../../../src/asyncapi'
import { diffsMatcher } from '../../helper/matchers'
import { asyncApiSuiteCaseIds, loadValidAsyncApiSuiteCase } from '../../helper/asyncapi'
import { compareFiles } from '../utils'

const SUITE_ID = 'semantic-mapping'

// The corpus baseline: two channels share the `order-events` address (which is why the generator
// emitted hashed ids in the first place), each with one message whose payload is
// `components/schemas/OrderEvent`. Only the second channel's message id carries a hash that flips.
const HASHED_CHANNEL_ID = 'orderEvents_1001'
const BEFORE_MESSAGE_ID = 'OrderEvent_1001'
const AFTER_MESSAGE_ID = 'OrderEvent_2002'
const CHANNEL_MESSAGES_PATH = ['channels', HASHED_CHANNEL_ID, 'messages']

const declarationPathsOf = (diff: Diff): JsonPath[] => [
  ...('beforeDeclarationPaths' in diff ? diff.beforeDeclarationPaths : []),
  ...('afterDeclarationPaths' in diff ? diff.afterDeclarationPaths : []),
]

const startsWith = (path: JsonPath, prefix: readonly string[]): boolean =>
  prefix.every((segment, index) => path[index] === segment)

const underChannelMessages = (diffs: Diff[]): Diff[] =>
  diffs.filter(diff => declarationPathsOf(diff).some(path => startsWith(path, CHANNEL_MESSAGES_PATH)))

describe('AsyncAPI semantic entity mapping', () => {
  // Enumerated from the corpus rather than listed here, so a case added to the suite is validated
  // without a second edit. `compareFiles` loads the corpus itself, so nothing else in this file
  // would notice a fixture that stopped being a valid AsyncAPI document - and the corpus lives in
  // a separately versioned package, where it can be edited without this repository seeing it.
  it.each(asyncApiSuiteCaseIds(SUITE_ID))('%s is a valid AsyncAPI 3.0.0 pair', async testId => {
    await loadValidAsyncApiSuiteCase(SUITE_ID, testId)
  })

  describe('message-id-changed', () => {
    it('reports nothing at all', async () => {
      const diffs = await compareFiles(SUITE_ID, 'message-id-changed', TEST_SPEC_TYPE_ASYNC_API)

      // The id hash flipped and nothing else did, so the message is simply the same message
      // wherever it is reachable from - inside its channel and inside the operation that
      // references it. A semantic match also leaves no trace of its own: no rename, whose
      // classifier slot is shared with `replace` and would report the pair as a real change.
      expect(diffs).toBeEmpty()
    })

    it('reports remove and add for the same pair when semantic mapping is off', async () => {
      const diffs = await compareFiles(
        SUITE_ID, 'message-id-changed', TEST_SPEC_TYPE_ASYNC_API, undefined,
        { asyncApiSemanticEntityMapping: false },
      )
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
  })
})
