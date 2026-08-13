import { EvaluationCacheService } from '@netcracker/qubership-apihub-api-unifier'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import {
  InternalCompareOptions,
  TraversalDimension,
  TraversalDimensions,
} from '../types'

export const EMPTY_DIMENSIONS: TraversalDimensions = Object.freeze(Object.create(null) as Record<string, string>)

// Serialized rather than joined, because a separator would collide `{a: 'b|c'}` with `{'a|b': 'c'}`, and
// sorted because two routes can state the same dimensions in either order
const contentIdentity = (dimensions: TraversalDimensions): string =>
  JSON.stringify(dimensions, Object.keys(dimensions).sort())

/** Interns the route contexts of one comparison, so the reuse caches can use a record's identity as a footprint. */
export interface DimensionsInterner {
  /** Applies a patch, ignoring `undefined` values, and hands the parent itself back when nothing changes. */
  mergeOrReuse(parent: TraversalDimensions, patch: TraversalDimensions | undefined): TraversalDimensions
}

export const createDimensionsInterner = (): DimensionsInterner => {
  const recordsByContent = new Map<string, TraversalDimensions>()

  return {
    mergeOrReuse: (parent, patch) => {
      if (!patch) {
        return parent
      }
      // Copied only once something changes, so a subtree-constant answer costs no record per node
      let merged: Record<string, string> | undefined = undefined
      for (const name of Object.keys(patch)) {
        const value = patch[name]
        if (value === undefined || value === parent[name]) {
          continue
        }
        if (!merged) {
          merged = Object.assign(Object.create(null), parent) as Record<string, string>
        }
        merged[name] = value
      }
      if (!merged) {
        return parent
      }
      const identity = contentIdentity(merged)
      const known = recordsByContent.get(identity)
      if (known) {
        return known
      }
      const frozen = Object.freeze(merged)
      recordsByContent.set(identity, frozen)
      return frozen
    },
  }
}

/** The declared dimensions of one comparison, in the shape the traversal uses them. */
interface ResolvedDimensions {
  interner: DimensionsInterner
  patchAt: ((path: JsonPath, beforeJso?: unknown, afterJso?: unknown) => TraversalDimensions | undefined) | undefined
}

export const assertDistinctDimensionNames = (dimensions: readonly TraversalDimension[]): void => {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const { name } of dimensions) {
    if (seen.has(name)) {
      duplicates.add(name)
    }
    seen.add(name)
  }
  if (duplicates.size) {
    throw new Error(`Traversal dimension declared more than once: ${[...duplicates].join(', ')}`)
  }
}

const buildPatchFunction = (dimensions: readonly TraversalDimension[]): ResolvedDimensions['patchAt'] => {
  if (!dimensions.length) {
    return undefined
  }
  assertDistinctDimensionNames(dimensions)
  return (path, beforeJso, afterJso) => {
    let patch: Record<string, string> | undefined = undefined
    for (const { name, valueAt } of dimensions) {
      const value = valueAt(path, beforeJso, afterJso)
      // `undefined` inherits, so it must not land in the patch
      if (value !== undefined) {
        patch = patch ?? Object.create(null) as Record<string, string>
        patch[name] = value
      }
    }
    return patch
  }
}

// The reuse cache is the identity of one comparison: every traversal of it, nested ones included, is handed
// that same instance, and one interner per comparison is what gives equal records one object. Weak on
// purpose, so the entry goes with the comparison; a strong map here pins every document ever compared.
const dimensionsByComparison = new WeakMap<EvaluationCacheService, ResolvedDimensions>()

/** The dimensions of the comparison this options object belongs to, resolved once. */
export const resolveDimensions = (options: InternalCompareOptions): ResolvedDimensions => {
  const known = dimensionsByComparison.get(options.mergedJsoCache)
  if (known) {
    return known
  }
  const resolved: ResolvedDimensions = {
    interner: createDimensionsInterner(),
    patchAt: buildPatchFunction(options.dimensions ?? []),
  }
  dimensionsByComparison.set(options.mergedJsoCache, resolved)
  return resolved
}
