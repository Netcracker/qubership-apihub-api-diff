import { objectMappingResolver } from '../src/core'
import { MapKeysResult, MappingObjectResolver } from '../src/types'
import {
  applySemanticPairing,
  AsyncApiSemanticPairing,
  compareSemanticTieBreak,
  pairLeftoversByIdentity,
  semanticMappingWrapper,
} from '../src/asyncapi/asyncapi3.mapping'
import { SemanticIdentity } from '../src/asyncapi/asyncapi3.types'

const identity = (value: string): SemanticIdentity => value as SemanticIdentity

const identityMap = (entries: Record<string, string>): Map<string, SemanticIdentity> =>
  new Map(Object.entries(entries).map(([key, value]) => [key, identity(value)]))

describe('pairLeftoversByIdentity', () => {
  it('pairs entries that share an identity', () => {
    const pairing = pairLeftoversByIdentity(
      identityMap({ oldA: 'A', oldB: 'B' }),
      identityMap({ newB: 'B', newA: 'A' }),
      compareSemanticTieBreak,
    )

    expect(pairing.pairs).toIncludeSameMembers([['oldA', 'newA'], ['oldB', 'newB']])
    expect(pairing.unpairedBefore).toBeEmpty()
    expect(pairing.unpairedAfter).toBeEmpty()
  })

  it('leaves surplus on the before side unpaired', () => {
    const pairing = pairLeftoversByIdentity(
      identityMap({ a1: 'A', a2: 'A' }),
      identityMap({ b1: 'A' }),
      compareSemanticTieBreak,
    )

    expect(pairing.pairs).toEqual([['a1', 'b1']]) // the tie-break picks the first key in key order
    expect(pairing.unpairedBefore).toEqual(['a2'])
    expect(pairing.unpairedAfter).toBeEmpty()
  })

  it('leaves surplus on the after side unpaired', () => {
    const pairing = pairLeftoversByIdentity(
      identityMap({ a1: 'A' }),
      identityMap({ b2: 'A', b1: 'A' }),
      compareSemanticTieBreak,
    )

    expect(pairing.pairs).toEqual([['a1', 'b1']])
    expect(pairing.unpairedBefore).toBeEmpty()
    expect(pairing.unpairedAfter).toEqual(['b2'])
  })

  it('pairs an ambiguous group deterministically, in tie-break order', () => {
    // Two consumer-equivalent entities: any 1-1 pairing is defensible, but it has to be the same
    // one on every run and in every component.
    const pairing = pairLeftoversByIdentity(
      identityMap({ zBefore: 'A', aBefore: 'A' }),
      identityMap({ zAfter: 'A', aAfter: 'A' }),
      compareSemanticTieBreak,
    )

    expect(pairing.pairs).toEqual([['aBefore', 'aAfter'], ['zBefore', 'zAfter']])
  })

  it('pairs nothing when no identity is shared', () => {
    const pairing = pairLeftoversByIdentity(
      identityMap({ a: 'A' }),
      identityMap({ b: 'B' }),
      compareSemanticTieBreak,
    )

    expect(pairing.pairs).toBeEmpty()
    expect(pairing.unpairedBefore).toEqual(['a'])
    expect(pairing.unpairedAfter).toEqual(['b'])
  })

  it('handles empty maps', () => {
    const pairing = pairLeftoversByIdentity(new Map(), identityMap({ b: 'B' }), compareSemanticTieBreak)

    expect(pairing.pairs).toBeEmpty()
    expect(pairing.unpairedBefore).toBeEmpty()
    expect(pairing.unpairedAfter).toEqual(['b'])
  })
})

describe('compareSemanticTieBreak', () => {
  it('orders strings by UTF-16 code unit', () => {
    expect(['b', 'A', 'a'].sort(compareSemanticTieBreak)).toEqual(['A', 'a', 'b'])
  })

  it('orders array indices numerically, not as strings', () => {
    expect([10, 2, 1].sort(compareSemanticTieBreak)).toEqual([1, 2, 10])
  })
})

/**
 * `applySemanticPairing` is the whole of the per-site logic once the deciding has moved to the
 * document level, so these drive it with a hand-written pairing rather than through a real
 * document: what is under test is the translation into the engine's vocabulary, not the identity
 * walk. `semantic-mapping.test.ts` covers the wiring end to end.
 */
const pairingOf = (couples: Record<string, string> = {}): AsyncApiSemanticPairing => ({
  // Fixture values name themselves, standing in for the declaration key a real node's origins
  // give it. A value with no `id` is a node the pairing cannot place, which is the third arm the
  // wrapper has to handle alongside "placed and paired" and "placed but unpaired".
  tokenOf: entity => (entity as { id?: string }).id,
  counterpartTokenOf: entity => {
    const token = (entity as { id?: string }).id
    return token === undefined ? undefined : couples[token]
  },
})

const noPairing = pairingOf()

const baseResultOf = (
  before: Record<string, unknown>, after: Record<string, unknown>,
): MapKeysResult<PropertyKey> =>
  objectMappingResolver(before, after, undefined as never) as MapKeysResult<PropertyKey>

describe('applySemanticPairing', () => {
  it('returns the base result untouched when nothing was removed', () => {
    const before = { keep: { id: 'a' } }
    const after = { keep: { id: 'a' }, extra: { id: 'b' } }
    const result = applySemanticPairing(baseResultOf(before, after), before, after, noPairing)

    expect(result.mapped).toEqual({ keep: 'keep' })
    expect(result.added).toEqual(['extra'])
    expect(result.removed).toBeEmpty()
  })

  it('returns the base result untouched when nothing was added', () => {
    const before = { keep: { id: 'a' }, gone: { id: 'b' } }
    const after = { keep: { id: 'a' } }
    const result = applySemanticPairing(baseResultOf(before, after), before, after, noPairing)

    expect(result.removed).toEqual(['gone'])
    expect(result.added).toBeEmpty()
  })

  it('rescues a leftover whose value the pairing gave a counterpart', () => {
    const before = { 'Msg_-170117217': { id: 'a' } }
    const after = { Msg_285519550: { id: 'b' } }
    const result = applySemanticPairing(
      baseResultOf(before, after), before, after, pairingOf({ a: 'b' }),
    )

    expect(result.mapped).toEqual({ 'Msg_-170117217': 'Msg_285519550' })
    expect(result.added).toBeEmpty()
    expect(result.removed).toBeEmpty()
  })

  it('never touches a pair the base resolver already produced', () => {
    const before = { same: { id: 'a' }, Msg_1: { id: 'b' } }
    const after = { same: { id: 'a' }, Msg_2: { id: 'c' } }
    const result = applySemanticPairing(
      baseResultOf(before, after), before, after, pairingOf({ b: 'c' }),
    )

    expect(result.mapped).toEqual({ same: 'same', Msg_1: 'Msg_2' })
  })

  it('keeps leftovers the pairing had no opinion about as add and remove', () => {
    const before = { gone: { id: 'a' } }
    const after = { fresh: { id: 'b' } }
    const result = applySemanticPairing(baseResultOf(before, after), before, after, noPairing)

    expect(result.mapped).toBeEmpty()
    expect(result.removed).toEqual(['gone'])
    expect(result.added).toEqual(['fresh'])
  })

  it('keeps a leftover the pairing cannot even place as add and remove', () => {
    // No token at all - a node whose origins name no entity container. Distinct from "placed but
    // unpaired", and it must not be confused with a counterpart lookup that returned nothing.
    const before = { gone: {} }
    const after = { fresh: {} }
    const result = applySemanticPairing(baseResultOf(before, after), before, after, pairingOf())

    expect(result.removed).toEqual(['gone'])
    expect(result.added).toEqual(['fresh'])
  })

  it('ignores a counterpart this container did not leave over', () => {
    // The pairing is document-wide, so it can name an entity this container matched by key or
    // does not hold at all. Only `added` is searched, which is what keeps the base authoritative.
    const before = { Msg_1: { id: 'a' } }
    const after = { Msg_1: { id: 'a' } }
    const result = applySemanticPairing(
      baseResultOf(before, after), before, after, pairingOf({ a: 'elsewhere' }),
    )

    expect(result.mapped).toEqual({ Msg_1: 'Msg_1' })
  })

  it('pairs across the container order, which is what makes two containers agree', () => {
    // The two leftovers cross: the first before-key pairs with the second after-key. Nothing here
    // reads the keys - the tokens decide - so a container listing the same two entities in the
    // other order reaches the same pairing, which is the whole point of deciding once.
    const before = { Msg_1: { id: 'alpha' }, Msg_2: { id: 'beta' } }
    const after = { Msg_3: { id: 'beta-after' }, Msg_4: { id: 'alpha-after' } }
    const result = applySemanticPairing(
      baseResultOf(before, after), before, after,
      pairingOf({ alpha: 'alpha-after', beta: 'beta-after' }),
    )

    expect(result.mapped).toEqual({ Msg_1: 'Msg_4', Msg_2: 'Msg_3' })
    expect(result.added).toBeEmpty()
    expect(result.removed).toBeEmpty()
  })

  it('keeps genuinely removed and added entries alongside a rescued pair', () => {
    const before = { Msg_1: { id: 'a' }, dropped: { id: 'gone' } }
    const after = { Msg_2: { id: 'b' }, appeared: { id: 'new' } }
    const result = applySemanticPairing(
      baseResultOf(before, after), before, after, pairingOf({ a: 'b' }),
    )

    expect(result.mapped).toEqual({ Msg_1: 'Msg_2' })
    expect(result.removed).toEqual(['dropped'])
    expect(result.added).toEqual(['appeared'])
  })

  it('gives one after-key to at most one before-key', () => {
    // Two before-keys can hold one entity when a container aliases it, and the pairing answers by
    // entity - so without the claim the result would stop being a function.
    const shared = { id: 'a' }
    const before = { Msg_1: shared, Msg_2: shared }
    const after = { Msg_3: { id: 'b' } }
    const result = applySemanticPairing(
      baseResultOf(before, after), before, after, pairingOf({ a: 'b' }),
    )

    expect(result.mapped).toEqual({ Msg_1: 'Msg_3' })
    expect(result.removed).toEqual(['Msg_2'])
    expect(result.added).toBeEmpty()
  })
})

describe('semanticMappingWrapper', () => {
  const base: MappingObjectResolver<string> = objectMappingResolver

  it('returns the base resolver itself when disabled, so a rule site is unchanged', () => {
    expect(semanticMappingWrapper(false)(base)).toBe(base)
  })

  it('returns a wrapper when enabled', () => {
    expect(semanticMappingWrapper(true)(base)).not.toBe(base)
  })
})
