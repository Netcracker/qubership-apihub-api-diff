import 'jest-extended'
import { apiDiff, breaking, risky } from '../src'
import type { ActionType, CompareOptions, Diff, DiffType } from '../src'
import type { InternalCompareOptions } from '../src/types'
import { createEvaluationCacheService, EvaluationCacheService } from '@netcracker/qubership-apihub-api-unifier'
import { createDimensionsInterner, DiffAction, EMPTY_DIMENSIONS, resolveDimensions } from '../src/core'
import { COMPARE_SCOPE_REQUEST } from '../src/openapi/openapi3.const'
import { sharedSchemaSpec } from './helper/sharedSchemaSpec'

const GONE = 'gone'
const SEASONED_PATH = '/seasoned'
const SEASONING = 'seasoning'
const SEASONED = 'seasoned'
const UNSEASONED = 'unseasoned'

const createSpec = (
  properties: Record<string, unknown>,
  shared: (schema: unknown) => unknown = (schema) => schema,
): unknown => sharedSchemaSpec([SEASONED_PATH, '/newcomer'], properties, shared)

const before = createSpec({
  keep: { type: 'string' },
  plain: { type: 'string' },
  [GONE]: { type: 'string', deprecated: true },
})
const after = createSpec({ keep: { type: 'string' } })

/** The shared schema wrapped in a combiner, so a nested compare runs over it. */
const withCombiner = (properties: Record<string, unknown>): unknown =>
  createSpec(properties, (schema) => ({ oneOf: [schema, { type: 'string' }] }))

/** A path item whose methods differ between the two documents. */
const withMethods = (methods: string[]): unknown => ({
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/thing': Object.fromEntries(methods.map(method => [method, { responses: { '200': { description: 'OK' } } }])),
  },
})

const isSeasonedOperationNode = (path?: readonly unknown[]): boolean =>
  path?.[0] === 'paths' && path?.[1] === SEASONED_PATH && path?.length === 3

/** Marks only `/seasoned`, so every other route inherits the empty route context. */
const seasoningOfOperation: CompareOptions['dimensions'] = [
  { name: SEASONING, valueAt: (path) => (isSeasonedOperationNode(path) ? SEASONED : undefined) },
]

const downgradeSeasonedRemoval: CompareOptions['classificationRules'] = [
  ({ action, type, dimensions, beforeValue }) => (
    action === DiffAction.remove &&
    type === breaking &&
    dimensions[SEASONING] === SEASONED &&
    !!beforeValue && typeof beforeValue === 'object' && 'deprecated' in beforeValue
      ? risky
      : undefined
  ),
]

/** Verdicts of a property removal as the operations see it; the declaration-site walk is left out. */
const operationRemovalsOf = (diffs: Diff[], propertyName: string): DiffType[] => diffs
  .filter(diff => diff.action === DiffAction.remove &&
    diff.scope === COMPARE_SCOPE_REQUEST &&
    'beforeDeclarationPaths' in diff &&
    diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === `components.schemas.Shared.properties.${propertyName}`))
  .map(({ type }) => type)

describe('a declared dimension splits difference instances', () => {
  it('should let routes that disagree about it reach their own verdicts', () => {
    const { diffs } = apiDiff(before, after, {
      dimensions: seasoningOfOperation,
      classificationRules: downgradeSeasonedRemoval,
    })

    // One removal reached from two operations, now two instances with their own verdicts
    expect(operationRemovalsOf(diffs, GONE)).toIncludeSameMembers([risky, breaking])

    // The walk of the declaration site itself is reached from no operation, so it stays one instance and
    // keeps the verdict the rules gave it
    const declarationRemovals = diffs.filter(diff => diff.action === DiffAction.remove &&
      diff.scope !== COMPARE_SCOPE_REQUEST &&
      'beforeDeclarationPaths' in diff &&
      diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === `components.schemas.Shared.properties.${GONE}`))
    expect(declarationRemovals.map(({ type }) => type)).toEqual([breaking])
  })

  // Two mechanisms hold this: `mergeOrReuse` returns the parent when a patch changes nothing, and interning
  // returns one record per content. The unit tests below isolate what they can.
  it('should keep one instance when a dimension restates what was inherited', () => {
    const { diffs: restated } = apiDiff(before, after, {
      dimensions: [{ name: SEASONING, valueAt: () => SEASONED }],
    })
    const { diffs: untouched } = apiDiff(before, after, {})

    // Every node answers the same value, so no node changes the inherited record and nothing splits
    expect(restated.map(({ type, scope, action }) => ({ type, scope, action })))
      .toIncludeSameMembers(untouched.map(({ type, scope, action }) => ({ type, scope, action })))
  })

  it('should not duplicate a difference when a nested node restores the inherited value', () => {
    const { diffs: baseline } = apiDiff(before, after, {})
    const { diffs: withNestedOverride } = apiDiff(before, after, {
      dimensions: [{
        // seasoned on the path item, taken back again on the operation below it
        name: SEASONING,
        valueAt: (path) => {
          if (!path?.length) {
            return UNSEASONED // the whole document, so that taking the seasoning back has a value to name
          }
          if (path[0] === 'paths' && path[1] === SEASONED_PATH && path.length === 2) {
            return SEASONED
          }
          return isSeasonedOperationNode(path) ? UNSEASONED : undefined
        },
      }],
    })

    // Both routes to the shared schema end up unseasoned, so the difference stays shared
    expect(withNestedOverride).toHaveLength(baseline.length)
  })

  it('should carry the route context into a combiner, and keep splitting there', () => {
    const seenInsideCombiner: (string | undefined)[] = []
    const { diffs } = apiDiff(
      withCombiner({ keep: { type: 'string' }, [GONE]: { type: 'string', deprecated: true } }),
      withCombiner({ keep: { type: 'string' } }),
      {
        dimensions: seasoningOfOperation,
        classificationRules: [
          ({ action, dimensions, beforeDeclarationPaths }) => {
            const insideCombiner = beforeDeclarationPaths.some(jsonPath => jsonPath.includes('oneOf'))
            if (action === DiffAction.remove && insideCombiner) {
              seenInsideCombiner.push(dimensions[SEASONING])
            }
            return undefined
          },
          ...downgradeSeasonedRemoval,
        ],
      },
    )

    expect(diffs).not.toBeEmpty()
    // A nested compare starts from the context of the node that opened the combiner, so a mark made
    // above it holds inside, and a rule reads one value wherever the difference was reached
    expect(seenInsideCombiner).not.toBeEmpty()
    expect(seenInsideCombiner).toContain(SEASONED)

    // And the two operations still reach their own verdicts inside the combiner
    const removals = diffs.filter(diff => diff.action === DiffAction.remove &&
      diff.scope === COMPARE_SCOPE_REQUEST &&
      'beforeDeclarationPaths' in diff &&
      diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === `components.schemas.Shared.oneOf.0.properties.${GONE}`))
    expect(removals.map(({ type }) => type)).toIncludeSameMembers([risky, breaking])
  })
})

describe('one interner for the whole comparison', () => {
  const reachedTwice = (properties: Record<string, unknown>): unknown => ({
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/direct': {
        post: {
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Inner' } } } },
          responses: { '200': { description: 'OK' } },
        },
      },
      '/viaCombiner': {
        post: {
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Shared' } } } },
          responses: { '200': { description: 'OK' } },
        },
      },
    },
    components: {
      schemas: {
        Inner: { type: 'object', properties: properties },
        Shared: { oneOf: [{ $ref: '#/components/schemas/Inner' }, { type: 'string' }] },
      },
    },
  })

  it('should not duplicate a difference reached inside and outside a combiner alike', () => {
    const { diffs } = apiDiff(
      reachedTwice({ keep: { type: 'string' }, [GONE]: { type: 'string' } }),
      reachedTwice({ keep: { type: 'string' } }),
      { dimensions: [{ name: SEASONING, valueAt: (path) => (path?.includes('properties') ? SEASONED : UNSEASONED) }] },
    )

    // A combiner is compared by a crawl of its own, which mints the record the outer crawl already has.
    // Were that crawl to intern separately, equal content would be two objects and the removal would be
    // reported once per crawl in every scope
    const removals = diffs.filter(diff =>
      'beforeDeclarationPaths' in diff &&
      diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.').includes(`properties.${GONE}`)))
    expect(removals.map(({ scope }) => scope)).toIncludeSameMembers([COMPARE_SCOPE_REQUEST, 'components'])
  })
})

describe('a dimension answered for the document root', () => {
  it('should keep a mark made below it, inside a combiner too', () => {
    const { diffs } = apiDiff(
      withCombiner({ keep: { type: 'string' }, [GONE]: { type: 'string', deprecated: true } }),
      withCombiner({ keep: { type: 'string' } }),
      {
        dimensions: [{
          name: SEASONING,
          // The shape a document-wide mark takes: an answer at the root, refined further down
          valueAt: (path) => {
            if (!path?.length) {
              return UNSEASONED
            }
            return isSeasonedOperationNode(path) ? SEASONED : undefined
          },
        }],
        classificationRules: downgradeSeasonedRemoval,
      },
    )

    // A combiner is compared by a traversal of its own, which reports the zero-length path for its root.
    // Asking the dimension there would answer for the document and undo the mark the route was reached
    // under, collapsing the two operations into one instance
    const removals = diffs.filter(diff => diff.action === DiffAction.remove &&
      diff.scope === COMPARE_SCOPE_REQUEST &&
      'beforeDeclarationPaths' in diff &&
      diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === `components.schemas.Shared.oneOf.0.properties.${GONE}`))
    expect(removals.map(({ type }) => type)).toIncludeSameMembers([risky, breaking])
  })
})

describe('what a dimension splits, and what it costs', () => {
  it('should split instances whatever the rules then decide', () => {
    const { diffs } = apiDiff(before, after, {
      dimensions: seasoningOfOperation,
      classificationRules: downgradeSeasonedRemoval,
    })

    // `plain` was never deprecated. The dimension splits its instances too, but the verdict is decided
    // per node, so neither copy is downgraded
    expect(operationRemovalsOf(diffs, 'plain')).toEqual([breaking, breaking])
  })

  it('should keep one instance when no dimension is declared', () => {
    const { diffs } = apiDiff(before, after, { classificationRules: downgradeSeasonedRemoval })

    expect(operationRemovalsOf(diffs, GONE)).toEqual([breaking])
  })

  // Both branches of the exit hook ask about a node the traversal never enters, and both must hand the
  // node itself rather than the container it sits in — a dimension keyed on the value would otherwise
  // answer for the whole path item.
  it.each<{ action: ActionType, before: string[], after: string[] }>([
    { action: DiffAction.remove, before: ['get', 'post'], after: ['get'] },
    { action: DiffAction.add, before: ['get'], after: ['get', 'post'] },
  ])('should answer for a node that is itself $action, seeing that node', ({ action, before, after }) => {
    const seenValues: (string | undefined)[] = []
    const nodesSeen: unknown[] = []
    apiDiff(withMethods(before), withMethods(after), {
      dimensions: [{
        name: SEASONING,
        valueAt: (path, beforeJso, afterJso) => {
          if (path?.[2] !== 'post') {
            return undefined
          }
          // The side that does not exist is `undefined`, the other one is the node being added or removed
          nodesSeen.push(beforeJso ?? afterJso)
          return SEASONED
        },
      }],
      classificationRules: [(context) => {
        if (context.action === action) {
          seenValues.push(context.dimensions[SEASONING])
        }
        return undefined
      }],
    })

    // A dimension anchored at the operation applies to the operation's own difference, which is created
    // while the parent path item is traversed
    expect(seenValues).toContain(SEASONED)
    // And it is asked about the operation, not about the path item holding it
    expect(nodesSeen).not.toBeEmpty()
    expect(nodesSeen).toSatisfyAll(node => !!node && typeof node === 'object' && 'responses' in node && !('get' in node))
  })

  it('should let a failing dimension abort the comparison', () => {
    // Unlike a classification rule, which leaves the computed verdict when it throws. Swallowing a failure
    // here would leave the document split in some places and not others
    expect(() => apiDiff(before, after, {
      dimensions: [{ name: SEASONING, valueAt: () => { throw new Error('dimension is broken') } }],
    })).toThrow('dimension is broken')
  })

  it('should still compare correctly when the value changes inside a subtree', () => {
    // Naming every node separately is the pathological case the option warns about: results stay correct,
    // but nothing is reused. The fixture is acyclic, where that only costs time
    const { diffs: perNode } = apiDiff(before, after, {
      dimensions: [{ name: SEASONING, valueAt: (path) => path?.join('.') ?? 'root' }],
    })
    const { diffs: untouched } = apiDiff(before, after, {})

    // Every difference of the plain comparison is still reported, verdict and all; splitting may add
    // instances of the same difference, and may not invent or lose one
    const asMembers = (diffs: Diff[]): unknown[] => diffs.map(({ type, scope, action }) => ({ type, scope, action }))
    expect(asMembers(perNode)).toIncludeAllMembers(asMembers(untouched))
    expect(new Set(asMembers(perNode).map(member => JSON.stringify(member))))
      .toEqual(new Set(asMembers(untouched).map(member => JSON.stringify(member))))
  })

  it('should refuse two dimensions under one name', () => {
    // The later one would answer for both, and the rule reading the earlier would see values it never
    // produced
    expect(() => apiDiff(before, after, {
      dimensions: [
        { name: SEASONING, valueAt: () => SEASONED },
        { name: SEASONING, valueAt: () => UNSEASONED },
      ],
    })).toThrow(`Traversal dimension declared more than once: ${SEASONING}`)
  })
})

describe('what the rules are handed', () => {
  const GARNISH = 'garnish'
  const GARNISHED = 'garnished'

  const isNewcomerOperationNode = (path?: readonly unknown[]): boolean =>
    path?.[0] === 'paths' && path?.[1] === '/newcomer' && path?.length === 3

  it('should carry every declared dimension, and split on any of them', () => {
    const seen: string[] = []
    const { diffs } = apiDiff(before, after, {
      dimensions: [
        ...seasoningOfOperation,
        { name: GARNISH, valueAt: (path) => (isNewcomerOperationNode(path) ? GARNISHED : undefined) },
      ],
      classificationRules: [({ action, dimensions }) => {
        if (action === DiffAction.remove) {
          seen.push(`${dimensions[SEASONING]}|${dimensions[GARNISH]}`)
        }
        return undefined
      }],
    })

    // Each operation states a different dimension, so the removal they share is reached under two records
    expect(operationRemovalsOf(diffs, GONE)).toHaveLength(2)
    expect(seen).toContain(`${SEASONED}|undefined`)
    expect(seen).toContain(`undefined|${GARNISHED}`)
  })

  it('should split on the one dimension that differs while the other agrees', () => {
    const seen: string[] = []
    const { diffs } = apiDiff(before, after, {
      dimensions: [
        // Both routes are told the same thing here, so this one cannot be what splits them
        { name: SEASONING, valueAt: (path) => (path?.[0] === 'paths' && path?.length === 3 ? SEASONED : undefined) },
        { name: GARNISH, valueAt: (path) => (isSeasonedOperationNode(path) ? GARNISHED : undefined) },
      ],
      classificationRules: [({ action, dimensions }) => {
        if (action === DiffAction.remove) {
          // Sorted, because the record's own identity is order-independent by design
          seen.push(Object.entries(dimensions).sort().map(([name, value]) => `${name}=${value}`).join(','))
        }
        return undefined
      }],
    })

    // One route carries two stated dimensions and the other only one, which is the multi-key record the
    // interner has to tell apart by content
    expect(operationRemovalsOf(diffs, GONE)).toHaveLength(2)
    expect(seen).toContain(`${GARNISH}=${GARNISHED},${SEASONING}=${SEASONED}`)
    expect(seen).toContain(`${SEASONING}=${SEASONED}`)
  })

  it('should read a dimension nobody declared as undefined', () => {
    const seen: unknown[] = []
    apiDiff(before, after, {
      dimensions: seasoningOfOperation,
      classificationRules: [({ dimensions }) => {
        seen.push(dimensions['nobody-declared-this'])
        return undefined
      }],
    })

    // The record holds what was stated and nothing else, so a rule reading a stray name gets `undefined`
    // rather than an empty string or an inherited member
    expect(seen).not.toBeEmpty()
    expect(seen.every(value => value === undefined)).toBe(true)
  })
})

describe('the dimensions interner', () => {
  it('should return the parent record for a patch that states nothing new', () => {
    const interner = createDimensionsInterner()
    const parent = interner.mergeOrReuse(EMPTY_DIMENSIONS, { [SEASONING]: SEASONED })

    expect(interner.mergeOrReuse(parent, { [SEASONING]: SEASONED })).toBe(parent)
    expect(interner.mergeOrReuse(parent, {})).toBe(parent)
    expect(interner.mergeOrReuse(parent, undefined)).toBe(parent)
  })

  it('should return one object per distinct content, whichever patches led to it', () => {
    const interner = createDimensionsInterner()
    const seasoned = interner.mergeOrReuse(EMPTY_DIMENSIONS, { [SEASONING]: SEASONED })
    const other = interner.mergeOrReuse(EMPTY_DIMENSIONS, { [SEASONING]: 'other' })

    // The reuse footprint leans on this: equal route contexts have to be the same object
    expect(interner.mergeOrReuse(EMPTY_DIMENSIONS, { [SEASONING]: SEASONED })).toBe(seasoned) // the same patch again
    expect(interner.mergeOrReuse(other, { [SEASONING]: SEASONED })).toBe(seasoned) // another chain, same content
    expect(other).not.toBe(seasoned) // different content
  })

  it('should not care in which order two dimensions were stated', () => {
    const interner = createDimensionsInterner()
    const seasonedThenGarnished = interner.mergeOrReuse(
      interner.mergeOrReuse(EMPTY_DIMENSIONS, { [SEASONING]: SEASONED }),
      { garnish: 'garnished' },
    )
    const garnishedThenSeasoned = interner.mergeOrReuse(
      interner.mergeOrReuse(EMPTY_DIMENSIONS, { garnish: 'garnished' }),
      { [SEASONING]: SEASONED },
    )

    // Routes reach the same node through different nodes, so the same content arrives in either order
    expect(seasonedThenGarnished).toBe(garnishedThenSeasoned)
  })

  it('should be resolved per comparison, so nothing outlives one apiDiff call', () => {
    const optionsOf = (mergedJsoCache: EvaluationCacheService): InternalCompareOptions =>
      ({ mergedJsoCache } as unknown as InternalCompareOptions)
    const ofOneComparison = createEvaluationCacheService()
    const ofAnother = createEvaluationCacheService()

    // Keyed by the reuse cache: one per apiDiff call, and shared by reference into nested compares
    expect(resolveDimensions(optionsOf(ofOneComparison)).interner)
      .toBe(resolveDimensions(optionsOf(ofOneComparison)).interner)
    expect(resolveDimensions(optionsOf(ofOneComparison)).interner)
      .not.toBe(resolveDimensions(optionsOf(ofAnother)).interner)
  })

  it('should hold a dimension named like a member of Object.prototype', () => {
    const seen: (string | undefined)[] = []
    apiDiff(before, after, {
      // The names are the caller's: on a record with a prototype `__proto__` would be swallowed by the
      // setter, and an unmarked route would read `toString` back as an inherited function
      dimensions: [{ name: '__proto__', valueAt: (path) => (isSeasonedOperationNode(path) ? SEASONED : undefined) }],
      classificationRules: [({ action, dimensions }) => {
        if (action === DiffAction.remove) {
          seen.push(dimensions['__proto__'])
        }
        return undefined
      }],
    })

    expect(seen).toContain(SEASONED)
    expect(seen).toContain(undefined)
  })

  it('should ignore undefined values in a patch', () => {
    const interner = createDimensionsInterner()
    const stated = interner.mergeOrReuse(EMPTY_DIMENSIONS, { [SEASONING]: SEASONED })

    expect(interner.mergeOrReuse(EMPTY_DIMENSIONS, { [SEASONING]: undefined })).toBe(EMPTY_DIMENSIONS)
    // The one that matters: `undefined` says nothing, so it must not clear what was inherited
    expect(interner.mergeOrReuse(stated, { [SEASONING]: undefined })).toBe(stated)
  })
})
