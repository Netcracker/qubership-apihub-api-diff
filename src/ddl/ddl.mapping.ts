import { createPropertyMappingResolver, deepEqualsUniqueItemsArrayMappingResolver } from '../core'
import { MapKeysResult, MappingArrayResolver } from '../types'
import { onlyExistedArrayIndexes } from '../utils'
import { DdlapiProperties } from './ddl.const'

// ddlapi collections are arrays whose elements have stable identity keys, so the default
// positional resolver is wrong (it reports a reorder as add+remove). These identity-based
// resolvers key elements by their logical identity.

/** schemas[] / tables[] / columns[] / indexes[] — keyed by `name`. */
export const nameMappingResolver: MappingArrayResolver = createPropertyMappingResolver(DdlapiProperties.Name)

/** foreignKeys[] — keyed by `symbol`. */
export const symbolMappingResolver: MappingArrayResolver = createPropertyMappingResolver(DdlapiProperties.Symbol)

/**
 * Builds a composite identity key for an attr/object element: `kind` for singletons
 * (one Comment/Collation/… per owner) and `kind:<id>` for named members, where `<id>` is the
 * first present of `name` (Check, NamedDefault), `symbol` (ForeignKey) or `type` (EnumType).
 * Returns `undefined` for non-object / kind-less elements so they are treated as unmatched.
 */
const attrIdentityKey = (item: unknown): string | undefined => {
  if (item === null || typeof item !== 'object') { return undefined }
  const record = item as Record<PropertyKey, unknown>
  const kind = record[DdlapiProperties.Kind]
  if (typeof kind !== 'string') { return undefined }
  const id = record[DdlapiProperties.Name] ?? record[DdlapiProperties.Symbol] ?? record[DdlapiProperties.Type]
  return typeof id === 'string' ? `${kind}:${id}` : kind
}

/**
 * attrs[] / table objects[] resolver — composite `kind`[`:name`] identity.
 * A Comment is a singleton-per-owner (keyed on `kind` alone) → powers description
 * add/remove/change; two same-kind different-name attrs (e.g. two Checks) map independently.
 */
export const attrsMappingResolver: MappingArrayResolver = (before, after) => {
  const result: MapKeysResult<number> = { added: [], removed: [], mapped: {} }
  const beforeIndexes = onlyExistedArrayIndexes(before)
  const afterIndexes = onlyExistedArrayIndexes(after)

  const afterKeyToIndex = new Map<string, number>()
  for (const j of afterIndexes) {
    const key = attrIdentityKey(after[j])
    if (key !== undefined && !afterKeyToIndex.has(key)) {
      afterKeyToIndex.set(key, j)
    }
  }

  const unmatchedAfter = new Set<number>(afterIndexes)
  for (const i of beforeIndexes) {
    const key = attrIdentityKey(before[i])
    if (key !== undefined && afterKeyToIndex.has(key)) {
      const j = afterKeyToIndex.get(key)!
      if (unmatchedAfter.has(j)) {
        result.mapped[i] = j
        unmatchedAfter.delete(j)
        continue
      }
    }
    result.removed.push(i)
  }
  for (const j of unmatchedAfter) {
    result.added.push(j)
  }
  return result
}

/**
 * EnumType.values[] — set semantics (the value string itself is the key). Pairs with
 * `ignoreKeyDifference` on the rule node so a reorder/position change is not reported as a
 * key rename. Powers enum value add/remove.
 */
export const enumValuesMappingResolver: MappingArrayResolver = deepEqualsUniqueItemsArrayMappingResolver

/**
 * index.parts[] — keyed by the referenced column name (`part.column.name`) so that adding or
 * removing a column is a clean element diff and the two parts of a column-order swap map to
 * themselves (the swap then surfaces as `seqNo` replace diffs, not add/remove churn).
 */
export const indexPartMappingResolver: MappingArrayResolver = (before, after) => {
  const partColumnName = (part: unknown): string | undefined => {
    if (part === null || typeof part !== 'object') { return undefined }
    const column = (part as Record<PropertyKey, unknown>)[DdlapiProperties.Column]
    if (column === null || typeof column !== 'object') { return undefined }
    const name = (column as Record<PropertyKey, unknown>)[DdlapiProperties.Name]
    return typeof name === 'string' ? name : undefined
  }

  const result: MapKeysResult<number> = { added: [], removed: [], mapped: {} }
  const beforeIndexes = onlyExistedArrayIndexes(before)
  const afterIndexes = onlyExistedArrayIndexes(after)

  const afterKeyToIndex = new Map<string, number>()
  for (const j of afterIndexes) {
    const key = partColumnName(after[j])
    if (key !== undefined && !afterKeyToIndex.has(key)) { afterKeyToIndex.set(key, j) }
  }

  const unmatchedAfter = new Set<number>(afterIndexes)
  for (const i of beforeIndexes) {
    const key = partColumnName(before[i])
    if (key !== undefined && afterKeyToIndex.has(key)) {
      const j = afterKeyToIndex.get(key)!
      if (unmatchedAfter.has(j)) {
        result.mapped[i] = j
        unmatchedAfter.delete(j)
        continue
      }
    }
    result.removed.push(i)
  }
  for (const j of unmatchedAfter) { result.added.push(j) }
  return result
}
