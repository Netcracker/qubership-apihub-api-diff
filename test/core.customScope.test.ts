import 'jest-extended'
import { apiDiff, breaking, risky } from '../src'
import type { ActionType, CompareOptions, Diff, DiffType } from '../src'
import { DiffAction } from '../src/core'
import { COMPARE_SCOPE_REQUEST } from '../src/openapi/openapi3.const'
import { customScopeSpec } from './helper/customScope'

const GONE = 'gone'
const SEASONED_PATH = '/seasoned'
const SEASONING = 'seasoning'
const SEASONED = 'seasoned'
const UNSEASONED = 'unseasoned'

const createSpec = (
  properties: Record<string, unknown>,
  shared: (schema: unknown) => unknown = (schema) => schema,
): unknown => customScopeSpec([SEASONED_PATH, '/newcomer'], properties, shared)

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

const isSeasonedOperationNode = (path: readonly unknown[]): boolean =>
  path[0] === 'paths' && path[1] === SEASONED_PATH && path.length === 3

/** Marks only `/seasoned`, so every other route inherits the empty custom scope. */
const seasoningOfOperation: CompareOptions['customScopeElementProviders'] = [
  { name: SEASONING, valueAt: ({ path }) => (isSeasonedOperationNode(path) ? SEASONED : undefined) },
]

const downgradeSeasonedRemoval: CompareOptions['reclassificationRules'] = [
  (diff) => (
    diff.action === DiffAction.remove &&
    diff.type === breaking &&
    diff.customScope?.[SEASONING] === SEASONED &&
    !!diff.beforeValue && typeof diff.beforeValue === 'object' && 'deprecated' in diff.beforeValue
      ? risky
      : undefined
  ),
]

/** Instances of a property removal as the operations see it; the declaration-site walk is left out. */
const operationRemovalDiffsOf = (diffs: Diff[], propertyName: string): Diff[] => diffs
  .filter(diff => diff.action === DiffAction.remove &&
    diff.scope === COMPARE_SCOPE_REQUEST &&
    'beforeDeclarationPaths' in diff &&
    diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === `components.schemas.Shared.properties.${propertyName}`))

/** Verdicts of those instances. */
const operationRemovalsOf = (diffs: Diff[], propertyName: string): DiffType[] =>
  operationRemovalDiffsOf(diffs, propertyName).map(({ type }) => type)

describe('a declared scope element splits difference instances', () => {
  it('should give routes that answer a scope element differently their own verdicts', () => {
    const { diffs } = apiDiff(before, after, {
      customScopeElementProviders: seasoningOfOperation,
      reclassificationRules: downgradeSeasonedRemoval,
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

  it('should carry the custom scope of its own route on the difference', () => {
    const { diffs } = apiDiff(before, after, {
      customScopeElementProviders: seasoningOfOperation,
      reclassificationRules: downgradeSeasonedRemoval,
    })

    // What a consumer reads off the result: each instance says which route reached it, and the route with
    // no element stated carries no record at all
    expect(operationRemovalDiffsOf(diffs, GONE).map(({ customScope, type }) => ({ customScope, type })))
      .toIncludeSameMembers([
        { customScope: { [SEASONING]: SEASONED }, type: risky },
        { customScope: undefined, type: breaking },
      ])
  })

  // Two mechanisms hold this: `mergeOrReuse` returns the parent when a patch changes nothing, and interning
  // returns one record per content. The unit tests below isolate what they can.
  it('should keep one instance when a scope element restates what was inherited', () => {
    const { diffs: restated } = apiDiff(before, after, {
      customScopeElementProviders: [{ name: SEASONING, valueAt: () => SEASONED }],
    })
    const { diffs: untouched } = apiDiff(before, after, {})

    // Every node answers the same value, so no node changes the inherited record and nothing splits
    expect(restated.map(({ type, scope, action }) => ({ type, scope, action })))
      .toIncludeSameMembers(untouched.map(({ type, scope, action }) => ({ type, scope, action })))
  })

  it('should not duplicate a difference when a nested node restores the inherited value', () => {
    const { diffs: baseline } = apiDiff(before, after, {})
    const { diffs: withNestedOverride } = apiDiff(before, after, {
      customScopeElementProviders: [{
        // seasoned on the path item, taken back again on the operation below it
        name: SEASONING,
        valueAt: ({ path }) => {
          if (!path.length) {
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
})

/**
 * A combiner is compared by a crawl of its own, which reports the zero-length path for its root and
 * mints records the outer crawl already holds. Everything that follows from that lives here.
 */
describe('inside a combiner', () => {
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

  it('should carry the custom scope into a combiner, and keep splitting there', () => {
    const seenInsideCombiner: (string | undefined)[] = []
    const { diffs } = apiDiff(
      withCombiner({ keep: { type: 'string' }, [GONE]: { type: 'string', deprecated: true } }),
      withCombiner({ keep: { type: 'string' } }),
      {
        customScopeElementProviders: seasoningOfOperation,
        reclassificationRules: [
          (diff) => {
            if (diff.action !== DiffAction.remove) {
              return undefined
            }
            if (diff.beforeDeclarationPaths.some(jsonPath => jsonPath.includes('oneOf'))) {
              seenInsideCombiner.push(diff.customScope?.[SEASONING])
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

  it('should not duplicate a difference reached inside and outside a combiner alike', () => {
    const { diffs } = apiDiff(
      reachedTwice({ keep: { type: 'string' }, [GONE]: { type: 'string' } }),
      reachedTwice({ keep: { type: 'string' } }),
      { customScopeElementProviders: [{ name: SEASONING, valueAt: ({ path }) => (path.includes('properties') ? SEASONED : UNSEASONED) }] },
    )

    // A combiner is compared by a crawl of its own, which mints the record the outer crawl already has.
    // Were that crawl to intern separately, equal content would be two objects and the removal would be
    // reported once per crawl in every scope
    const removals = diffs.filter(diff =>
      'beforeDeclarationPaths' in diff &&
      diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.').includes(`properties.${GONE}`)))
    expect(removals.map(({ scope }) => scope)).toIncludeSameMembers([COMPARE_SCOPE_REQUEST, 'components'])
  })

  it('should keep a mark made on an operation when a combiner answers for the document root', () => {
    const { diffs } = apiDiff(
      withCombiner({ keep: { type: 'string' }, [GONE]: { type: 'string', deprecated: true } }),
      withCombiner({ keep: { type: 'string' } }),
      {
        customScopeElementProviders: [{
          name: SEASONING,
          // The shape a document-wide mark takes: an answer at the root, refined further down
          valueAt: ({ path }) => {
            if (!path.length) {
              return UNSEASONED
            }
            return isSeasonedOperationNode(path) ? SEASONED : undefined
          },
        }],
        reclassificationRules: downgradeSeasonedRemoval,
      },
    )

    // A combiner is compared by a traversal of its own, which reports the zero-length path for its root.
    // Asking the provider there would answer for the document and undo the mark the route was reached
    // under, collapsing the two operations into one instance
    const removals = diffs.filter(diff => diff.action === DiffAction.remove &&
      diff.scope === COMPARE_SCOPE_REQUEST &&
      'beforeDeclarationPaths' in diff &&
      diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === `components.schemas.Shared.oneOf.0.properties.${GONE}`))
    expect(removals.map(({ type }) => type)).toIncludeSameMembers([risky, breaking])
  })

  const DEPRECATION = 'deprecation'
  const DEPRECATED = 'deprecated'
  const OPTION = 'option'
  const ADDED_OR_REMOVED_OPTION = 'components.schemas.Shared.oneOf.2'

  /** The shared schema as a combiner of itself, a string, and the options given. */
  const combinerOf = (moreOptions: unknown[]): unknown =>
    createSpec({ keep: { type: 'string' } }, (schema) => ({ oneOf: [schema, { type: 'string' }, ...moreOptions] }))

  it('should ask about a removed combiner option', () => {
    const { diffs } = apiDiff(
      combinerOf([{ type: 'integer', deprecated: true }]),
      combinerOf([]),
      {
        customScopeElementProviders: [{
          name: DEPRECATION,
          valueAt: ({ beforeJso }) => (!!beforeJso && typeof beforeJso === 'object' && 'deprecated' in beforeJso ? DEPRECATED : undefined),
        }],
      },
    )

    // The option is compared by no crawl, so only the combiner can ask the provider about it
    const removals = diffs.filter(diff => diff.action === DiffAction.remove &&
      diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === ADDED_OR_REMOVED_OPTION))
    expect(removals).not.toBeEmpty()
    expect(removals.map(({ customScope }) => customScope?.[DEPRECATION])).toSatisfyAll(value => value === DEPRECATED)
  })

  /** Answers for a combiner option with the index the provider is asked about it at. */
  const optionIndexProviders: CompareOptions['customScopeElementProviders'] = [{
    name: OPTION,
    valueAt: ({ path }) => (path[path.length - 2] === 'oneOf' ? String(path[path.length - 1]) : undefined),
  }]

  it('should ask about an added combiner option at its index under the combiner', () => {
    const { diffs } = apiDiff(
      combinerOf([]),
      combinerOf([{ type: 'integer' }]),
      { customScopeElementProviders: optionIndexProviders },
    )

    const additions = diffs.filter(diff => diff.action === DiffAction.add &&
      diff.afterDeclarationPaths.some(jsonPath => jsonPath.join('.') === ADDED_OR_REMOVED_OPTION))
    expect(additions).not.toBeEmpty()
    expect(additions.map(({ customScope }) => customScope?.[OPTION])).toSatisfyAll(value => value === '2')
  })

  it('should ask about a removed combiner option at its index in the before document', () => {
    // The boolean option pairs with index 2 of the after document, so the removed integer option takes
    // index 3 of the merged array while the before document declares it under index 2
    const { diffs } = apiDiff(
      combinerOf([{ type: 'integer' }, { type: 'boolean' }]),
      combinerOf([{ type: 'boolean' }]),
      { customScopeElementProviders: optionIndexProviders },
    )

    const removals = diffs.filter(diff => diff.action === DiffAction.remove &&
      diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === ADDED_OR_REMOVED_OPTION))
    expect(removals).not.toBeEmpty()
    expect(removals.map(({ customScope }) => customScope?.[OPTION])).toSatisfyAll(value => value === '2')
  })
})

describe('what a scope element splits', () => {
  it('should split instances whatever the rules then decide', () => {
    const { diffs } = apiDiff(before, after, {
      customScopeElementProviders: seasoningOfOperation,
      reclassificationRules: downgradeSeasonedRemoval,
    })

    // `plain` was never deprecated. The scope element splits its instances too, but the verdict is decided
    // per node, so neither copy is downgraded
    expect(operationRemovalsOf(diffs, 'plain')).toEqual([breaking, breaking])
  })

  it('should keep one instance when no scope element is declared', () => {
    const { diffs } = apiDiff(before, after, { reclassificationRules: downgradeSeasonedRemoval })

    expect(operationRemovalsOf(diffs, GONE)).toEqual([breaking])
  })

  // Both branches of the exit hook ask about a node the traversal never enters, and both must hand the
  // node itself rather than the container it sits in — a scope element keyed on the value would otherwise
  // answer for the whole path item.
  it.each<{ action: ActionType, before: string[], after: string[] }>([
    { action: DiffAction.remove, before: ['get', 'post'], after: ['get'] },
    { action: DiffAction.add, before: ['get'], after: ['get', 'post'] },
  ])('should answer for a node that is itself $action, seeing that node', ({ action, before, after }) => {
    const seenValues: (string | undefined)[] = []
    const nodesSeen: unknown[] = []
    apiDiff(withMethods(before), withMethods(after), {
      customScopeElementProviders: [{
        name: SEASONING,
        valueAt: ({ path, beforeJso, afterJso }) => {
          if (path[2] !== 'post') {
            return undefined
          }
          // The side that does not exist is `undefined`, the other one is the node being added or removed
          nodesSeen.push(beforeJso ?? afterJso)
          return SEASONED
        },
      }],
      reclassificationRules: [(diff) => {
        if (diff.action === action) {
          seenValues.push(diff.customScope?.[SEASONING])
        }
        return undefined
      }],
    })

    // A scope element anchored at the operation applies to the operation's own difference, which is created
    // while the parent path item is traversed
    expect(seenValues).toContain(SEASONED)
    // And it is asked about the operation, not about the path item holding it
    expect(nodesSeen).not.toBeEmpty()
    expect(nodesSeen).toSatisfyAll(node => !!node && typeof node === 'object' && 'responses' in node && !('get' in node))
  })

  it('should produce the same differences when a scope element answers per node', () => {
    // Naming every node separately is the pathological case the option warns about: results stay correct,
    // but nothing is reused. The fixture is acyclic, where that only costs time
    const { diffs: perNode } = apiDiff(before, after, {
      customScopeElementProviders: [{ name: SEASONING, valueAt: ({ path }) => path.join('.') || 'root' }],
    })
    const { diffs: untouched } = apiDiff(before, after, {})

    // Every difference of the plain comparison is still reported, verdict and all; splitting may add
    // instances of the same difference, and may not invent or lose one
    const asMembers = (diffs: Diff[]): unknown[] => diffs.map(({ type, scope, action }) => ({ type, scope, action }))
    expect(asMembers(perNode)).toIncludeAllMembers(asMembers(untouched))
    expect(new Set(asMembers(perNode).map(member => JSON.stringify(member))))
      .toEqual(new Set(asMembers(untouched).map(member => JSON.stringify(member))))
  })
})

/**
 * A provider is caller code running inside the traversal, so what happens when it is wrong is part
 * of the contract.
 */
describe('a provider that misbehaves', () => {
  it('should let a failing provider abort the comparison', () => {
    // Unlike a reclassification rule, which leaves the computed verdict when it throws. Swallowing a failure
    // here would leave the document split in some places and not others
    expect(() => apiDiff(before, after, {
      customScopeElementProviders: [{ name: SEASONING, valueAt: () => { throw new Error('provider is broken') } }],
    })).toThrow('provider is broken')
  })

  it('should refuse two providers under one name', () => {
    // The later one would answer for both, and the rule reading the earlier would see values it never
    // produced
    expect(() => apiDiff(before, after, {
      customScopeElementProviders: [
        { name: SEASONING, valueAt: () => SEASONED },
        { name: SEASONING, valueAt: () => UNSEASONED },
      ],
    })).toThrow(`Custom scope element declared more than once: ${SEASONING}`)
  })
})

describe('what the rules are handed', () => {
  const GARNISH = 'garnish'
  const GARNISHED = 'garnished'

  const isNewcomerOperationNode = (path: readonly unknown[]): boolean =>
    path[0] === 'paths' && path[1] === '/newcomer' && path.length === 3

  it('should carry every declared scope element, and split on any of them', () => {
    const seen: string[] = []
    const { diffs } = apiDiff(before, after, {
      customScopeElementProviders: [
        ...seasoningOfOperation,
        { name: GARNISH, valueAt: ({ path }) => (isNewcomerOperationNode(path) ? GARNISHED : undefined) },
      ],
      reclassificationRules: [({ action, customScope }) => {
        if (action === DiffAction.remove) {
          seen.push(`${customScope?.[SEASONING]}|${customScope?.[GARNISH]}`)
        }
        return undefined
      }],
    })

    // Each operation states a different scope element, so the removal they share is reached under two records
    expect(operationRemovalsOf(diffs, GONE)).toHaveLength(2)
    expect(seen).toContain(`${SEASONED}|undefined`)
    expect(seen).toContain(`undefined|${GARNISHED}`)
  })

  it('should split on the one scope element that differs while the other agrees', () => {
    const seen: string[] = []
    const { diffs } = apiDiff(before, after, {
      customScopeElementProviders: [
        // Both routes are told the same thing here, so this one cannot be what splits them
        { name: SEASONING, valueAt: ({ path }) => (path[0] === 'paths' && path.length === 3 ? SEASONED : undefined) },
        { name: GARNISH, valueAt: ({ path }) => (isSeasonedOperationNode(path) ? GARNISHED : undefined) },
      ],
      reclassificationRules: [({ action, customScope }) => {
        if (action === DiffAction.remove) {
          // Sorted, because the record's own identity is order-independent by design
          seen.push(Object.entries(customScope ?? {}).sort().map(([name, value]) => `${name}=${value}`).join(','))
        }
        return undefined
      }],
    })

    // One route carries two stated elements and the other only one, which is the multi-key record the
    // interner has to tell apart by content
    expect(operationRemovalsOf(diffs, GONE)).toHaveLength(2)
    expect(seen).toContain(`${GARNISH}=${GARNISHED},${SEASONING}=${SEASONED}`)
    expect(seen).toContain(`${SEASONING}=${SEASONED}`)
  })

  it('should read a scope element nobody declared as undefined', () => {
    const seen: unknown[] = []
    apiDiff(before, after, {
      customScopeElementProviders: seasoningOfOperation,
      reclassificationRules: [({ customScope }) => {
        seen.push(customScope?.['nobody-declared-this'])
        return undefined
      }],
    })

    // The record holds what was stated and nothing else, so a rule reading a stray name gets `undefined`
    // rather than an empty string or an inherited member
    expect(seen).not.toBeEmpty()
    expect(seen.every(value => value === undefined)).toBe(true)
  })

  it('should hold a scope element named like a member of Object.prototype', () => {
    const seen: (string | undefined)[] = []
    apiDiff(before, after, {
      // The names are the caller's: on a record with a prototype `__proto__` would be swallowed by the
      // setter, and an unmarked route would read `toString` back as an inherited function
      customScopeElementProviders: [{ name: '__proto__', valueAt: ({ path }) => (isSeasonedOperationNode(path) ? SEASONED : undefined) }],
      reclassificationRules: [({ action, customScope }) => {
        if (action === DiffAction.remove) {
          seen.push(customScope?.['__proto__'])
        }
        return undefined
      }],
    })

    expect(seen).toContain(SEASONED)
    expect(seen).toContain(undefined)
  })
})
