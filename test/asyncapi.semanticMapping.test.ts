import { objectMappingResolver } from '../src/core'
import { CompareContext, MappingObjectResolver } from '../src/types'
import {
  compareSemanticTieBreak,
  pairLeftoversByIdentity,
  SemanticIdentitySelector,
  semanticMappingWrapper,
  withSemanticMapping,
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
 * Every fixture value carries its own identity, so these tests exercise the wrapper without a real
 * document or index behind it.
 */
const identityOfOwnField: SemanticIdentitySelector = () => (value: object) => {
  const own = (value as { identity?: string }).identity
  return own === undefined ? undefined : identity(own)
}

const noIdentity: SemanticIdentitySelector = () => () => undefined

// The wrapper reads only the two roots and the origins flag off the context.
const emptyContext = (): CompareContext => ({
  before: { root: {} },
  after: { root: {} },
  options: { originsFlag: Symbol('origins') },
} as CompareContext)

describe('withSemanticMapping', () => {
  const mapping = withSemanticMapping(objectMappingResolver, identityOfOwnField)

  it('returns the base result untouched when nothing was removed', () => {
    const result = mapping(
      { keep: { identity: 'A' } },
      { keep: { identity: 'A' }, extra: { identity: 'B' } },
      emptyContext(),
    )

    expect(result.mapped).toEqual({ keep: 'keep' })
    expect(result.added).toEqual(['extra'])
    expect(result.removed).toBeEmpty()
  })

  it('returns the base result untouched when nothing was added', () => {
    const result = mapping(
      { keep: { identity: 'A' }, gone: { identity: 'B' } },
      { keep: { identity: 'A' } },
      emptyContext(),
    )

    expect(result.removed).toEqual(['gone'])
    expect(result.added).toBeEmpty()
  })

  it('rescues a leftover pair that shares an identity', () => {
    const result = mapping(
      { 'Msg_-170117217': { identity: 'A' } },
      { Msg_285519550: { identity: 'A' } },
      emptyContext(),
    )

    expect(result.mapped).toEqual({ 'Msg_-170117217': 'Msg_285519550' })
    expect(result.added).toBeEmpty()
    expect(result.removed).toBeEmpty()
  })

  it('never touches a pair the base resolver already produced', () => {
    const result = mapping(
      { same: { identity: 'A' }, Msg_1: { identity: 'B' } },
      { same: { identity: 'A' }, Msg_2: { identity: 'B' } },
      emptyContext(),
    )

    expect(result.mapped).toEqual({ same: 'same', Msg_1: 'Msg_2' })
  })

  it('keeps leftovers whose identity is undefined as add and remove', () => {
    const result = mapping({ gone: {} }, { fresh: {} }, emptyContext())

    expect(result.mapped).toBeEmpty()
    expect(result.removed).toEqual(['gone'])
    expect(result.added).toEqual(['fresh'])
  })

  it('keeps genuinely removed and added entries alongside a rescued pair', () => {
    const result = mapping(
      { Msg_1: { identity: 'A' }, dropped: { identity: 'GONE' } },
      { Msg_2: { identity: 'A' }, appeared: { identity: 'NEW' } },
      emptyContext(),
    )

    expect(result.mapped).toEqual({ Msg_1: 'Msg_2' })
    expect(result.removed).toEqual(['dropped'])
    expect(result.added).toEqual(['appeared'])
  })
})

describe('semanticMappingWrapper', () => {
  const base: MappingObjectResolver<string> = objectMappingResolver

  it('returns the base resolver itself when disabled, so a rule site is unchanged', () => {
    expect(semanticMappingWrapper(false)(base, noIdentity)).toBe(base)
  })

  it('returns a wrapper when enabled', () => {
    expect(semanticMappingWrapper(true)(base, noIdentity)).not.toBe(base)
  })
})
