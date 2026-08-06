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

export const API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE'
export const API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE = 'NOT_BACKWARD_COMPATIBLE'

export type ApiCompatibilityKind = typeof API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE
  | typeof API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE

export type ApiCompatibilityScopeFunction = (path?: JsonPath, beforeJso?: unknown, afterJso?: unknown) => ApiCompatibilityKind | undefined

/** Name of a group of traversals that must not share difference instances. */
export type TraversalPartition = string

export type TraversalPartitionFunction = (path?: JsonPath, beforeJso?: unknown, afterJso?: unknown) => TraversalPartition | undefined

/**
 * State of a difference at the moment it is classified.
 * `type` is the verdict the rules produced, after the api-compatibility downgrade.
 * `partition` is the traversal group the difference was reached through, and the only field
 * that says where it was reached from, so an override can answer per route.
 */
export interface DiffClassificationContext {
  action: ActionType
  type: DiffType
  partition: TraversalPartition | undefined
  beforeDeclarationPaths: JsonPath[]
  beforeValue: unknown
}

export type DiffClassificationOverride = (context: DiffClassificationContext) => DiffType | undefined

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
   * Function that marks specific paths/values as backward compatible
   * or non-backward compatible. Use it to mark a specific path or object,
   * so diffs under it are treated as risky when needed.
   * Returns
   * `NOT_BACKWARD_COMPATIBLE` when any change under the matched path must be considered risky.
   * `BACKWARD_COMPATIBLE` when it should inherit/allow backward-compatible way.
   * `undefined` to inherit the parent scope.
   */
  apiCompatibilityScopeFunction?: ApiCompatibilityScopeFunction
  /**
   * Last word on how a single difference is classified. Use it when the verdict depends on
   * knowledge the library does not have, such as publication history. Unlike
   * `apiCompatibilityScopeFunction`, which marks a whole subtree, this is called once per
   * difference, while it is created.
   * Returns
   * a diff type to use instead of the computed one.
   * `undefined` to keep the computed one, which is also what happens if the function throws.
   */
  diffClassificationOverride?: DiffClassificationOverride
  /**
   * Function that names the route a node is reached through, so two routes to the same node yield
   * separate difference instances instead of one shared. It changes no verdict by itself:
   * `diffClassificationOverride` reads the name and decides.
   * Returns
   * a partition name for the matched path.
   * `undefined` to inherit the parent partition.
   *
   * The name joins the reuse footprint, so keep it constant within a subtree and match on whole
   * paths. A name that varies from node to node disables the reuse that makes traversal of a cyclic
   * document terminate, and combiner options report paths relative to the option. Every extra
   * partition repeats the traversal it shares with the others.
   */
  traversalPartitionFunction?: TraversalPartitionFunction
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
   * Traversal partition the nested compare starts from. A nested compare (combiner items) begins
   * its own crawl and would otherwise fall back to what `traversalPartitionFunction` answers for
   * the root, losing the partition it was reached under.
   */
  initialTraversalPartition?: TraversalPartition
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
  apiCompatibilityScope: ApiCompatibilityKind
  traversalPartition: TraversalPartition | undefined
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
