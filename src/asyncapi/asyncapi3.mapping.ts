import { CompareContext, MapKeysResult, MappingArrayResolver, MappingObjectResolver } from '../types'
import { isObject } from '../utils'
import {
  AsyncApiEntityKeySpace,
  AsyncApiEntityKind,
  AsyncApiLogicalIndex,
  entityRefOf,
  entityRefToken,
  logicalIndexOf,
  MemberKeyResolver,
} from './asyncapi3.identity'
import { SemanticIdentity } from './asyncapi3.types'

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

/**
 * Which after-side entity each before-side entity was paired with, decided **once per document
 * pair** and read by every rule site.
 *
 * The alternative - deciding at each site, from whatever that site's container happened to hold -
 * is unsound, because the same two entities reach different answers under different containers.
 * A channel's `messages` map keys by message id while an operation's `messages[]` keys by
 * position, so a tie-break over "the container's own key" sorts one group two ways; and the two
 * containers hold different candidate sets, so they are not even the same group. Deciding once,
 * over a pool assembled from the whole document, makes both differences disappear together.
 */
export interface AsyncApiSemanticPairing {
  /**
   * An opaque token naming the entity a node *is*, equal for two nodes exactly when they are the
   * same declared entity of the same document. Object identity would not do: the compare
   * pipeline's per-reference decoration makes `operations/*_/messages[i]` a different object from
   * the `channels/*_/messages` entry it references.
   */
  tokenOf(entity: object): string | undefined

  /** The token of the after-side entity this before-side node was paired with. */
  counterpartTokenOf(beforeEntity: object): string | undefined
}

const EMPTY_PAIRING: AsyncApiSemanticPairing = {
  tokenOf: () => undefined,
  counterpartTokenOf: () => undefined,
}

/**
 * The identities of the entities that enter the pairing pool: those whose raw source key is
 * absent from the other document's key set for their kind.
 *
 * That key-absence test is the document-level form of the per-site "only when the base resolver
 * left both an addition and a removal" trigger, and it carries the same guarantee - the semantic
 * pass can never contradict a key match. Without it, an ambiguous group whose keys partly agree
 * could be zipped into pairs that cut across what the base resolver already matched at the site.
 */
const leftoverIdentities = (
  space: AsyncApiEntityKeySpace,
  otherKeys: ReadonlySet<string>,
  identityOf: (entity: object) => SemanticIdentity | undefined,
): Map<string, SemanticIdentity> => {
  const identities = new Map<string, SemanticIdentity>()
  for (const [key, entity] of space.entityOf) {
    if (otherKeys.has(key)) {
      continue
    }
    const identity = identityOf(entity)
    if (identity === undefined) {
      continue
    }
    identities.set(key, identity)
  }
  return identities
}

/**
 * Decides the whole pairing for one document pair, bottom-up.
 *
 * Messages are paired first because a channel's and an operation's identity both name their
 * member messages by a canonical key, which only exists once the messages have been paired. That
 * ordering is what separates two containers a payload set alone leaves indistinguishable: the
 * reference sample's two channels share an address and a payload set, and differ only in which
 * message they hold.
 */
const buildSemanticPairing = (
  beforeRoot: unknown, afterRoot: unknown, originsFlag: symbol,
): AsyncApiSemanticPairing => {
  const before = logicalIndexOf(beforeRoot, originsFlag)
  const after = logicalIndexOf(afterRoot, originsFlag)
  const counterpartTokens = new Map<string, string>()
  const tokenOf = (entity: object): string | undefined => {
    const ref = entityRefOf(entity, originsFlag)
    return ref === undefined ? undefined : entityRefToken(ref)
  }

  const pairKind = (
    kind: AsyncApiEntityKind,
    kindOf: (index: AsyncApiLogicalIndex) => AsyncApiEntityKeySpace,
    identityOfBefore: (entity: object) => SemanticIdentity | undefined,
    identityOfAfter: (entity: object) => SemanticIdentity | undefined,
  ): ReadonlyArray<readonly [string, string]> => {
    const beforeSpace = kindOf(before)
    const afterSpace = kindOf(after)
    const { pairs } = pairLeftoversByIdentity(
      leftoverIdentities(beforeSpace, afterSpace.keys, identityOfBefore),
      leftoverIdentities(afterSpace, beforeSpace.keys, identityOfAfter),
      compareSemanticTieBreak,
    )
    for (const [beforeKey, afterKey] of pairs) {
      counterpartTokens.set(entityRefToken({ kind, key: beforeKey }), entityRefToken({ kind, key: afterKey }))
    }
    return pairs
  }

  const messagePairs = pairKind(
    'messages', index => index.messages,
    entity => before.identityOfMessage(entity),
    entity => after.identityOfMessage(entity),
  )

  // The after side reads its member messages in the *before* side's key space, so a member whose
  // id merely churned contributes the same segment on both sides and cannot, by itself, keep two
  // containers apart. A member that was not paired keeps its own key, which is then a genuine
  // difference between the two containers.
  const beforeKeyOfAfterMessage = new Map<string, string>(
    messagePairs.map(([beforeKey, afterKey]) => [afterKey, beforeKey]),
  )
  const memberKeyOf = (canonicalize: boolean): MemberKeyResolver => message => {
    const ref = entityRefOf(message, originsFlag)
    if (ref === undefined || ref.kind !== 'messages') { return undefined }
    return canonicalize ? beforeKeyOfAfterMessage.get(ref.key) ?? ref.key : ref.key
  }
  const beforeMemberKey = memberKeyOf(false)
  const afterMemberKey = memberKeyOf(true)

  pairKind(
    'channels', index => index.channels,
    entity => before.identityOfChannel(entity, beforeMemberKey),
    entity => after.identityOfChannel(entity, afterMemberKey),
  )
  pairKind(
    'operations', index => index.operations,
    entity => before.identityOfOperation(entity, beforeMemberKey),
    entity => after.identityOfOperation(entity, afterMemberKey),
  )

  return {
    tokenOf,
    counterpartTokenOf: beforeEntity => {
      const token = tokenOf(beforeEntity)
      return token === undefined ? undefined : counterpartTokens.get(token)
    },
  }
}

interface MemoizedPairing {
  readonly originsFlag: symbol
  readonly pairing: AsyncApiSemanticPairing
}

const pairingCache = new WeakMap<object, WeakMap<object, MemoizedPairing>>()

/**
 * The pairing for a pair of normalized roots, memoized so it is decided once per `apiDiff` call
 * however many rule sites ask for it. Nested rather than single-keyed because the decision belongs
 * to the *pair*: the same before-document compared against two after-documents has two answers.
 *
 * The origins flag is part of what was computed, so a different one rebuilds rather than answering
 * with identities derived from another document's origins - the same guard `logicalIndexOf` uses.
 */
export const semanticPairingOf = (
  beforeRoot: unknown, afterRoot: unknown, originsFlag: symbol,
): AsyncApiSemanticPairing => {
  if (!isObject(beforeRoot) || !isObject(afterRoot)) {
    return EMPTY_PAIRING
  }
  let byAfterRoot = pairingCache.get(beforeRoot)
  if (!byAfterRoot) {
    byAfterRoot = new WeakMap()
    pairingCache.set(beforeRoot, byAfterRoot)
  }
  const memoized = byAfterRoot.get(afterRoot)
  if (memoized && memoized.originsFlag === originsFlag) {
    return memoized.pairing
  }
  const pairing = buildSemanticPairing(beforeRoot, afterRoot, originsFlag)
  byAfterRoot.set(afterRoot, { originsFlag, pairing })
  return pairing
}

/**
 * Rewrites a base mapping result in the light of an already-decided pairing. Pure, and separate
 * from `withSemanticMapping` because this is the whole of the per-site logic once the deciding has
 * moved out: for each key the base resolver could not match, ask which after-side object its value
 * was paired with, and find the leftover after-key holding that object.
 *
 * Restricting the search to `result.added` is what keeps the base resolver authoritative - a pair
 * it produced is never touched - and `claimed` keeps the result a function even if one object is
 * reachable under two keys of the same container.
 */
export const applySemanticPairing = (
  result: MapKeysResult<PropertyKey>,
  before: Record<PropertyKey, unknown>,
  after: Record<PropertyKey, unknown>,
  pairing: AsyncApiSemanticPairing,
): MapKeysResult<PropertyKey> => {
  if (result.added.length === 0 || result.removed.length === 0) {
    return result
  }

  const addedKeyOf = new Map<string, PropertyKey>()
  for (const key of result.added) {
    const value = after[key]
    const token = isObject(value) ? pairing.tokenOf(value) : undefined
    if (token !== undefined && !addedKeyOf.has(token)) {
      addedKeyOf.set(token, key)
    }
  }

  const pairs: Array<readonly [PropertyKey, PropertyKey]> = []
  const claimed = new Set<PropertyKey>()
  for (const beforeKey of result.removed) {
    const value = before[beforeKey]
    if (!isObject(value)) {
      continue
    }
    const counterpart = pairing.counterpartTokenOf(value)
    if (counterpart === undefined) {
      continue
    }
    const afterKey = addedKeyOf.get(counterpart)
    if (afterKey === undefined || claimed.has(afterKey)) {
      continue
    }
    claimed.add(afterKey)
    pairs.push([beforeKey, afterKey])
  }
  if (pairs.length === 0) {
    return result
  }

  // Translate the pairing back into the engine's vocabulary: a pair becomes a `mapped` entry,
  // and whatever stayed unpaired keeps the base resolver's verdict. Filtering the base arrays
  // preserves their original order and keeps leftovers the pairing had no opinion about.
  const pairedBefore = new Set<PropertyKey>(pairs.map(([beforeKey]) => beforeKey))
  const mapped = { ...result.mapped } as Record<PropertyKey, PropertyKey>
  for (const [beforeKey, afterKey] of pairs) {
    mapped[beforeKey] = afterKey
  }
  return {
    mapped,
    removed: result.removed.filter(key => !pairedBefore.has(key)),
    added: result.added.filter(key => !claimed.has(key)),
  }
}

/**
 * Wraps a mapping resolver with a second, semantic pass over whatever the first pass could not
 * match. The base resolver stays authoritative: a pair it produced is never touched.
 *
 * Runs **only** when the base result holds both an addition and a removal - with nothing to rescue
 * there is nothing to do, and building the document-level pairing is wasted work. Under the
 * document-level pairing this is an early-out rather than the isolation guarantee it used to be:
 * isolation now comes from the pool the pairing is built over, which holds only entities whose raw
 * key is absent from the other document.
 */
export function withSemanticMapping(base: MappingObjectResolver<string>): MappingObjectResolver<string>
export function withSemanticMapping(base: MappingArrayResolver): MappingArrayResolver
export function withSemanticMapping(
  base: MappingObjectResolver<string> | MappingArrayResolver,
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

    const pairing = semanticPairingOf(ctx.before.root, ctx.after.root, ctx.options.originsFlag)
    return applySemanticPairing(result, before, after, pairing)
  }
  return wrapped as MappingObjectResolver<string> | MappingArrayResolver
}

/** The call signature `withSemanticMapping` exposes, so the disabled variant can stand in for it. */
export interface SemanticMappingWrapper {
  (base: MappingObjectResolver<string>): MappingObjectResolver<string>
  (base: MappingArrayResolver): MappingArrayResolver
}

/**
 * The escape hatch of `asyncApiSemanticEntityMapping`. When disabled this returns the base
 * resolver itself at rule-construction time, so the feature costs nothing at runtime and a rule
 * site is indistinguishable from what it was before.
 */
export const semanticMappingWrapper = (enabled: boolean): SemanticMappingWrapper => {
  return enabled ? withSemanticMapping : ((base: unknown) => base) as SemanticMappingWrapper
}
