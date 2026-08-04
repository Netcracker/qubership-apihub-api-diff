import { CompareContext, MapKeysResult, MappingArrayResolver, MappingObjectResolver } from '../types'
import { isObject } from '../utils'
import { AsyncApiLogicalIndex, logicalIndexOf } from './asyncapi3.identity'
import { SemanticIdentity } from './asyncapi3.types'

/**
 * Picks which identity of the index applies at a rule site: `payloadIdentityOf` inside a channel
 * or an operation (where the action and address are already fixed by the parent),
 * `identityOfChannel` / `identityOfOperation` / `identityOfMessage` at the top-level maps.
 *
 * There is deliberately no `before | after` parameter. A leftover before-key indexes into the
 * before document and a leftover after-key into the after document, so the wrapper resolves each
 * side's index itself and applies the matching one. The selector only ever sees one document's
 * index and a value from that same document.
 */
export type SemanticIdentitySelector =
  (index: AsyncApiLogicalIndex) => (value: object) => SemanticIdentity | undefined

/**
 * The result of pairing leftovers. Uses before/after vocabulary rather than `MapKeysResult`'s
 * `mapped` / `added` / `removed`: this is a generic pairing utility, not a diff result. Callers
 * translate.
 */
export interface LeftoverPairing<K extends PropertyKey> {
  readonly pairs: ReadonlyArray<readonly [before: K, after: K]>
  readonly unpairedBefore: readonly K[]
  readonly unpairedAfter: readonly K[]
}

/**
 * The one tie-break every component must use when an identity is shared by several entities.
 *
 * Lexicographic (UTF-16 code unit) over the raw source key - the AsyncAPI map key
 * (`operationId`, `channelId`, `messageId`) - never a slugified id, whose transformation can
 * reorder keys that differ only in punctuation or case. Array indices compare numerically, so
 * `2` sorts before `10` rather than after it.
 */
export const compareSemanticTieBreak = (a: PropertyKey, b: PropertyKey): number => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  const left = a.toString()
  const right = b.toString()
  return left < right ? -1 : left > right ? 1 : 0
}

const groupByIdentity = <K extends PropertyKey>(
  source: ReadonlyMap<K, SemanticIdentity>,
  compareKeys: (a: K, b: K) => number,
): Map<SemanticIdentity, K[]> => {
  const groups = new Map<SemanticIdentity, K[]>()
  for (const [key, identity] of source) {
    const group = groups.get(identity)
    if (group) {
      group.push(key)
    } else {
      groups.set(identity, [key])
    }
  }
  for (const group of groups.values()) {
    group.sort(compareKeys)
  }
  return groups
}

/**
 * Pairs the entries of two identity maps one-to-one, identity by identity. Surplus on either side
 * stays unpaired.
 *
 * Entities that share an identity are consumer-equivalent by the identity criterion, so any 1-1
 * pairing among them is defensible - refusing to pair would reproduce exactly the remove+add noise
 * this exists to remove. `compareKeys` is what makes the choice stable across runs and across
 * components; it is **required** with no default, because an optional-with-default parameter lets
 * one caller pass the shared comparator while another silently relies on the default, and the two
 * diverge the moment the default changes.
 *
 * Taking two maps rather than a key list plus a `(key, side)` callback is what removes any notion
 * of a side: each map already belongs to one document.
 */
export const pairLeftoversByIdentity = <K extends PropertyKey>(
  before: ReadonlyMap<K, SemanticIdentity>,
  after: ReadonlyMap<K, SemanticIdentity>,
  compareKeys: (a: K, b: K) => number,
): LeftoverPairing<K> => {
  const beforeGroups = groupByIdentity(before, compareKeys)
  const afterGroups = groupByIdentity(after, compareKeys)

  const pairs: Array<readonly [K, K]> = []
  const unpairedBefore: K[] = []
  const unpairedAfter: K[] = []

  for (const [identity, beforeKeys] of beforeGroups) {
    const afterKeys = afterGroups.get(identity) ?? []
    const pairedCount = Math.min(beforeKeys.length, afterKeys.length)
    for (let i = 0; i < pairedCount; i++) {
      pairs.push([beforeKeys[i], afterKeys[i]])
    }
    unpairedBefore.push(...beforeKeys.slice(pairedCount))
  }

  for (const [identity, afterKeys] of afterGroups) {
    const pairedCount = Math.min(beforeGroups.get(identity)?.length ?? 0, afterKeys.length)
    unpairedAfter.push(...afterKeys.slice(pairedCount))
  }

  return { pairs, unpairedBefore, unpairedAfter }
}

const identityMapOf = (
  keys: readonly PropertyKey[],
  container: Record<PropertyKey, unknown>,
  identityOf: (value: object) => SemanticIdentity | undefined,
): Map<PropertyKey, SemanticIdentity> => {
  const identities = new Map<PropertyKey, SemanticIdentity>()
  for (const key of keys) {
    const value = container[key]
    if (!isObject(value)) {
      continue
    }
    const identity = identityOf(value)
    if (identity === undefined) {
      continue
    }
    identities.set(key, identity)
  }
  return identities
}

/**
 * Wraps a mapping resolver with a second, semantic pass over whatever the first pass could not
 * match. The base resolver stays authoritative: a pair it produced is never touched.
 *
 * Runs **only** when the base result holds both an addition and a removal - with nothing to rescue
 * there is nothing to do, and that is the isolation guarantee this feature is specified around: a
 * cleanly-matching document behaves exactly as before.
 */
export function withSemanticMapping(
  base: MappingObjectResolver<string>, pick: SemanticIdentitySelector,
): MappingObjectResolver<string>
export function withSemanticMapping(
  base: MappingArrayResolver, pick: SemanticIdentitySelector,
): MappingArrayResolver
export function withSemanticMapping(
  base: MappingObjectResolver<string> | MappingArrayResolver,
  pick: SemanticIdentitySelector,
): MappingObjectResolver<string> | MappingArrayResolver {
  // The two overloads differ in their container type (`Record<string, unknown>` vs
  // `Array<unknown>`) and key type (string vs numeric index), but the wrapping is identical, so
  // the implementation works on the widest shape and casts at the two boundaries.
  const wrapped = (
    before: Record<PropertyKey, unknown>,
    after: Record<PropertyKey, unknown>,
    ctx: CompareContext,
  ): MapKeysResult<PropertyKey> => {
    const baseResolver = base as MappingObjectResolver<string>
    const result = baseResolver(
      before as Record<string, unknown>,
      after as Record<string, unknown>,
      ctx,
    ) as MapKeysResult<PropertyKey>

    if (result.added.length === 0 || result.removed.length === 0) {
      return result
    }

    const { originsFlag } = ctx.options
    const beforeIdentities = identityMapOf(
      result.removed, before, pick(logicalIndexOf(ctx.before.root, originsFlag)),
    )
    const afterIdentities = identityMapOf(
      result.added, after, pick(logicalIndexOf(ctx.after.root, originsFlag)),
    )

    const { pairs } = pairLeftoversByIdentity(beforeIdentities, afterIdentities, compareSemanticTieBreak)
    if (pairs.length === 0) {
      return result
    }

    // Translate the pairing back into the engine's vocabulary: a pair becomes a `mapped` entry,
    // and whatever stayed unpaired keeps the base resolver's verdict. Filtering the base arrays
    // rather than reading `unpairedBefore` / `unpairedAfter` preserves their original order and
    // keeps leftovers that never entered the identity maps (identity `undefined`).
    const pairedBefore = new Set<PropertyKey>(pairs.map(([beforeKey]) => beforeKey))
    const pairedAfter = new Set<PropertyKey>(pairs.map(([, afterKey]) => afterKey))
    const mapped = { ...result.mapped } as Record<PropertyKey, PropertyKey>
    for (const [beforeKey, afterKey] of pairs) {
      mapped[beforeKey] = afterKey
    }
    return {
      mapped,
      removed: result.removed.filter(key => !pairedBefore.has(key)),
      added: result.added.filter(key => !pairedAfter.has(key)),
    }
  }
  return wrapped as MappingObjectResolver<string> | MappingArrayResolver
}

/** The call signature `withSemanticMapping` exposes, so the disabled variant can stand in for it. */
export interface SemanticMappingWrapper {
  (base: MappingObjectResolver<string>, pick: SemanticIdentitySelector): MappingObjectResolver<string>
  (base: MappingArrayResolver, pick: SemanticIdentitySelector): MappingArrayResolver
}

/**
 * The escape hatch of `asyncApiSemanticEntityMapping`. When disabled this returns the base
 * resolver itself at rule-construction time, so the feature costs nothing at runtime and a rule
 * site is indistinguishable from what it was before.
 */
export const semanticMappingWrapper = (enabled: boolean): SemanticMappingWrapper => {
  return enabled ? withSemanticMapping : (base => base) as SemanticMappingWrapper
}
