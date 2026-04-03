export { COMPARE_MODE_DEFAULT, COMPARE_MODE_OPERATION, API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE, API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE } from './types'

export {
  ClassifierType,
  DiffAction,
  DIFFS_AGGREGATED_META_KEY,
  DIFF_META_KEY,
  breaking,
  nonBreaking,
  unclassified,
  annotation,
  deprecated,
  risky,
} from './core'

export { apiDiff } from './api'
export type {
  CompareResult,
  CompareOptions,
  ApiCompatibilityScopeFunction,
  ApiCompatibilityKind,
  DiffType,
  ActionType,
  Diff,
  DiffAdd,
  DiffRemove,
  DiffReplace,
  DiffRename,
  DiffMetaRecord,
  DiffClassifier,
  DiffClassifierResult,
  ClassifyRuleIdResolver,
  ClassifyRuleIdElement,
  ClassifyRuleIdRule,
} from './types'

export {
  isDiffAdd,
  isDiffRemove,
  isDiffRename,
  isDiffReplace,
} from './utils'

export {
  aggregateDiffsWithRollup,
  extractOperationBasePath,
  onlyExistedArrayIndexes
} from './utils'

export { REST_CLASSIFY_RULE_IDS } from './openapi'
export { JSON_SCHEMA_CLASSIFY_RULE_IDS } from './jsonSchema'
