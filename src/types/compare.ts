import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

import { CompareContext, CompareRules } from './rules'
import { ClassifierType, DiffAction, JSO_ROOT } from '../core'
import { EvaluationCacheService, NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'

export type ActionType = keyof typeof DiffAction
export type DiffType = typeof ClassifierType[keyof typeof ClassifierType]
export type CompareScope = string

export const COMPARE_SCOPE_ROOT: CompareScope = 'root'

/**
 * Diff should be unique by [type, beforeDeclarationPaths, afterDeclarationPaths, scope]
 */
interface DiffBase<T> {
  type: T
  scope: CompareScope
  description?: string
}

export interface DiffAdd<T = DiffType> extends DiffBase<T> {
  action: typeof DiffAction.add
  /**
   * declaration path in after document. Empty array can be if value doesn't exist in 'after' spec or value have synthetic origin
   */
  afterDeclarationPaths: JsonPath[]
  afterValue: unknown
  [key: symbol]: unknown
}

export interface DiffRemove<T = DiffType> extends DiffBase<T> {
  action: typeof DiffAction.remove
  /**
   * declaration path in before document. Empty array can be if value doesn't exist in 'before' spec or value have synthetic origin
   */
  beforeDeclarationPaths: JsonPath[]
  beforeValue: unknown
  [key: symbol]: unknown
}

export interface DiffReplace<T = DiffType> extends DiffBase<T> {
  action: typeof DiffAction.replace
  /**
   * declaration path in before document. Empty array can be if value doesn't exist in 'before' spec or value have synthetic origin
   */
  beforeDeclarationPaths: JsonPath[]
  /**
   * declaration path in after document. Empty array can be if value doesn't exist in 'after' spec or value have synthetic origin
   */
  afterDeclarationPaths: JsonPath[]
  afterValue: unknown
  beforeValue: unknown
  [key: symbol]: unknown
}

export interface DiffRename<T = DiffType> extends DiffBase<T> {
  action: typeof DiffAction.rename
  /**
   * declaration path in before document. Empty array can be if value doesn't exist in 'before' spec or value have synthetic origin
   */
  beforeDeclarationPaths: JsonPath[]
  /**
   * declaration path in after document. Empty array can be if value doesn't exist in 'after' spec or value have synthetic origin
   */
  afterDeclarationPaths: JsonPath[]
  afterKey: unknown
  beforeKey: unknown
}

export type Diff<T = DiffType> = DiffAdd<T> | DiffRemove<T> | DiffReplace<T> | DiffRename<T>

export interface CompareResult {
  diffs: Diff[]
  ownerDiffEntry: DiffEntry<Diff> | undefined
  merged: unknown
}

export type DiffMetaRecord = Record<PropertyKey, Diff/*actually array should be here. Cause same JSO can be access by several parallel ways*/>

export const COMPARE_MODE_DEFAULT = 'default'
export const COMPARE_MODE_OPERATION = 'operation'

export type CompareMode = typeof COMPARE_MODE_DEFAULT | typeof COMPARE_MODE_OPERATION

export type TraversalDimensions = Readonly<Record<string, string | undefined>>

/**
 * One dimension of the route context, declared by the caller that gives it meaning. Keep a value constant
 * within a subtree and match on whole paths: a value that varies from node to node disables the reuse that
 * makes traversal of a cyclic document terminate, and combiner options report paths relative to the option.
 */
export interface TraversalDimension {
  /** Key the merged route context holds this dimension under, and the one a rule reads it back by. */
  name: string
  /**
   * Asked for a node of the document, the zero-length path being the document itself, and for every added
   * or removed key, which is a node the traversal never enters. Asked more than once for the same node
   * when a combiner pairs its options, so keep it free of side effects. The root of a nested compare is
   * not asked, so an answer meant for the document cannot undo what a combiner was reached under.
   * Returns
   * a value that holds from this node down.
   * `undefined` to inherit the one of the enclosing node.
   */
  valueAt: (path: JsonPath, beforeJso?: unknown, afterJso?: unknown) => string | undefined
}

/**
 * State of a difference at the moment it is classified. `type` is what the preceding rule left, starting
 * from the verdict the classify rules produced; `dimensions` is the route it was reached through.
 */
export interface DiffClassificationContext {
  action: ActionType
  type: DiffType
  dimensions: TraversalDimensions
  beforeDeclarationPaths: JsonPath[]
  beforeValue: unknown
}

/**
 * One step of the classification pipeline, run in the order the rules are given. A rule is handed the
 * verdict the spec rules produced, or the one the rule before it left.
 * Returns
 * a diff type to replace that verdict with.
 * `undefined` to leave it as it stands, which is also what a rule that throws leaves behind.
 */
export type DiffClassificationRule = (context: DiffClassificationContext) => DiffType | undefined

export interface CompareOptions extends Omit<NormalizeOptions, 'source'> {
  mode?: CompareMode
  normalizedResult?: boolean
  metaKey?: symbol         // metakey for merge changes
  beforeSource?: unknown
  afterSource?: unknown
  onCreateDiffError?: (message: string, diff: Diff, ctx: CompareContext) => void
  beforeValueNormalizedProperty?: symbol
  afterValueNormalizedProperty?: symbol
  /**
   * Route context the traversal carries, inherited down to the leaves and into `oneOf`, `anyOf` and
   * `allOf`. Routes that disagree about a dimension get separate difference instances, and every extra
   * value repeats the traversal of the subtree those routes share: declare a dimension for what routes
   * must be able to disagree about, not for everything a rule would like to know.
   * A dimension can be stated and restated from a node down, never unstated.
   */
  dimensions?: readonly TraversalDimension[]
  /**
   * Classification pipeline, consulted in order after the spec rules produced a verdict, for a verdict
   * that depends on knowledge the library does not have. A rule has to be pure; one that throws leaves
   * the verdict where the rule before it left it and does not stop the rules after it.
   * Returns
   * a diff type to use instead of the computed one.
   * `undefined` to leave the verdict to the next rule, which is also what happens if a rule throws.
   */
  classificationRules?: readonly DiffClassificationRule[]
  /**
   * For OpenAPI specs:
   * If a whole PathItem is removed, generate separate diffs for each HTTP operation (get/post/...)
   * instead of a single diff for the whole PathItem.
   *
   * Default: `false`
   */
  openApiPathItemPerOperationDiffs?: boolean
  /**
   * When true, the symbol value stored under `firstReferenceKeyProperty` will be preserved in the merged result.
   * Set automatically by the AsyncAPI engine when `firstReferenceKeyProperty` is user-provided.
   */
  retainFirstReferenceKeyProperty?: boolean
}

export type DiffCallback = (diff: Diff/*, ctx: CompareContext*/) => void

export interface StrictCompareOptions extends Omit<CompareOptions, 'defaultsFlag' | 'originsFlag'> {
  mode: CompareMode
  normalizedResult: boolean
  metaKey: symbol
  defaultsFlag: symbol,
  originsFlag: symbol,
  compareScope: CompareScope
  mergedJsoCache: EvaluationCacheService
  diffUniquenessCache: EvaluationCacheService
  valueAdaptationCache: EvaluationCacheService
  createdMergedJso: Set<JsonNode>,
}

export interface InternalCompareOptions extends StrictCompareOptions {
  rules: CompareRules
  /**
   * Route context a nested compare (the items of a combiner) was reached under. Present only for one,
   * which is how the crawl knows the zero-length path of its own root is not the document.
   */
  nestedDimensions?: TraversalDimensions
}

export type CompareEngine = (before: unknown, after: unknown, options: StrictCompareOptions) => CompareResult

export type NodeRoot = { [JSO_ROOT]: any }
export type KeyMapping = Record<PropertyKey, PropertyKey>

export interface MergeState<T extends PropertyKey = string> {
  parentContext: CompareContext | undefined
  keyMap: KeyMapping            // parent keys mappings
  afterJso: JsonNode<T>
  beforeJso: JsonNode<T>
  mergedJso: JsonNode<T>
  root: {
    before: NodeRoot
    after: NodeRoot
    merged: JsonNode<T>
  }
  mergedJsoCache: EvaluationCacheService,
  diffUniquenessCache: EvaluationCacheService,
  createdMergedJso: Set<JsonNode>,
  compareScope: CompareScope
  dimensions: TraversalDimensions
}

export type JsonNode<Key extends PropertyKey = string> = Key extends (string | symbol) ? Record<string | symbol, unknown> : Record<number, unknown> | Array<unknown>

export interface DiffEntry<D extends Diff> {
  readonly propertyKey: PropertyKey
  readonly diff: D
}

export interface DiffFactory {
  added: (ctx: CompareContext) => DiffAdd
  removed: (ctx: CompareContext) => DiffRemove
  replaced: (ctx: CompareContext) => DiffReplace
  renamed: (ctx: CompareContext) => DiffRename
}

export interface ContextInput extends MergeState {
  beforeValue: unknown
  afterValue: unknown
  afterKey: PropertyKey
  beforeKey: PropertyKey
  mergeKey: PropertyKey
  rules: CompareRules
}
