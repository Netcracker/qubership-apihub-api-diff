import { MapKeysResult, MappingArrayResolver, MappingResolver } from '../types'
import { onlyExistedArrayIndexes } from '../utils'
import { deepEqual } from 'fast-equals'

//todo this method nor ready to sparse array
export const arrayMappingResolver: MappingResolver<number> = (before, after) => {
  const length = Math.abs(before.length - after.length)
  const arr = Array.from({ length: Math.min(before.length, after.length) }, ((_, i) => i))

  return {
    removed: before.length > after.length ? Array.from({ length }, (_, i) => after.length + i) : [],
    added: before.length < after.length ? Array.from({ length }, (_, i) => before.length + i) : [],
    mapped: arr.reduce((res, i) => {
      res[i] = i
      return res
    }, {} as Record<number, number>),
  }
}

export const customUniqueItemsArrayMappingResolver: (equalityFn: (one: unknown, another: unknown) => boolean) => MappingResolver<number> = (equalityFn) => (before, after) => {
  const result: MapKeysResult<number> = { added: [], removed: [], mapped: {} }
  const beforeArrayIndexes = onlyExistedArrayIndexes(before)
  const afterArrayIndexes = onlyExistedArrayIndexes(after)
  const beforeMatchedArrayIndexes = new Set<number>(beforeArrayIndexes)
  const afterMatchedArrayIndexes = new Set<number>(afterArrayIndexes)

  // compare all combinations, find equality
  for (const i of beforeArrayIndexes) {
    const beforeItem = before[i]
    for (const j of afterArrayIndexes) {
      if (!afterMatchedArrayIndexes.has(j)) { continue }
      const afterItem = after[j]
      if (equalityFn(beforeItem, afterItem)) {
        afterMatchedArrayIndexes.delete(j)
        beforeMatchedArrayIndexes.delete(i)
        result.mapped[i] = j
        break
      }
    }
  }

  for (const j of afterMatchedArrayIndexes.values()) {
    result.added.push(j)
  }

  for (const i of beforeMatchedArrayIndexes.values()) {
    result.removed.push(i)
  }
  return result
}

export const deepEqualsUniqueItemsArrayMappingResolver: MappingResolver<number> = customUniqueItemsArrayMappingResolver(deepEqual)

/**
 * Creates an array-mapping resolver that matches items by the value of a given property.
 *
 * For each non‑sparse index in the `before` and `after` arrays, this resolver:
 *
 * - Reads `propertyKey` from the array element (only if the element is a non‑null object)
 * - Builds a lookup from string property value → index for the `after` array
 * - For every `before[i]` whose property value is a string present in the lookup,
 *   records a mapping `i → j` where `j` is the corresponding index in `after`
 * - Treats `before` items whose property is missing or not found in `after` as **removed**
 * - Treats remaining `after` items that were never matched as **added**
 *
 * This is used for arrays (e.g. AsyncAPI messages/servers, ddlapi tables/columns/attrs)
 * where elements are conceptually keyed by some identifier property (a name, symbol, or
 * captured reference key), so that reordering the array does not produce spurious
 * add/remove or rename diffs.
 *
 * @param propertyKey - The object property whose string value is used as the logical key
 *   to match `before` and `after` array items.
 * @returns A {@link MappingArrayResolver} that maps array indices based on `propertyKey`.
 */
export const createPropertyMappingResolver = (
  propertyKey: PropertyKey,
): MappingArrayResolver => (before, after) => {
  const result: MapKeysResult<number> = { added: [], removed: [], mapped: {} }
  const beforeIndexes = onlyExistedArrayIndexes(before)
  const afterIndexes = onlyExistedArrayIndexes(after)

  // Build lookup: property string value → after index
  const afterKeyToIndex = new Map<string, number>()
  for (const j of afterIndexes) {
    const item = after[j]
    if (item !== null && typeof item === 'object') {
      const key = (item as Record<PropertyKey, unknown>)[propertyKey]
      if (typeof key === 'string') {
        afterKeyToIndex.set(key, j)
      }
    }
  }

  const unmatchedAfterIndexes = new Set<number>(afterIndexes)

  for (const i of beforeIndexes) {
    const item = before[i]
    const key = (item !== null && typeof item === 'object')
      ? (item as Record<PropertyKey, unknown>)[propertyKey]
      : undefined

    if (typeof key === 'string' && afterKeyToIndex.has(key)) {
      const j = afterKeyToIndex.get(key)!
      result.mapped[i] = j
      unmatchedAfterIndexes.delete(j)
    } else {
      result.removed.push(i)
    }
  }

  for (const j of unmatchedAfterIndexes) {
    result.added.push(j)
  }

  return result
}

export const objectMappingResolver: MappingResolver<string> = (before, after) => {

  const result: MapKeysResult<string> = { added: [], removed: [], mapped: {} }
  const afterKeys = new Set(Object.keys(after))

  for (const key of Object.keys(before)) {
    if (afterKeys.has(key)) {
      result.mapped[key] = key
      afterKeys.delete(key)
    } else {
      result.removed.push(key)
    }
  }

  afterKeys.forEach((key) => result.added.push(key))

  return result
}
