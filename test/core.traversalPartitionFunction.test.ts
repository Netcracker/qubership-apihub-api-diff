import 'jest-extended'
import { apiDiff, breaking, risky } from '../src'
import type { CompareOptions, Diff, DiffType } from '../src'
import { DiffAction } from '../src/core'
import { COMPARE_SCOPE_REQUEST } from '../src/openapi/openapi3.const'

const GONE = 'gone'
const SEASONED_PATH = '/seasoned'
const SEASONED = 'seasoned'

const createSpec = (properties: Record<string, unknown>): unknown => ({
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    [SEASONED_PATH]: {
      post: {
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Shared' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/newcomer': {
      post: {
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Shared' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
  },
  components: { schemas: { Shared: { type: 'object', properties: properties } } },
})

const before = createSpec({
  keep: { type: 'string' },
  plain: { type: 'string' },
  [GONE]: { type: 'string', deprecated: true },
})
const after = createSpec({ keep: { type: 'string' } })

// Only `/seasoned` is allowed to disagree with the rest of the document about what it reaches. Everything
// else inherits no name and goes on sharing difference instances.
const partitionBySeasonedOperation: CompareOptions['traversalPartitionFunction'] = (path) =>
  (path?.[0] === 'paths' && path?.[1] === SEASONED_PATH && path?.length === 3 ? SEASONED : undefined)

const downgradeInSeasonedPartition: CompareOptions['diffClassificationOverride'] = ({ action, type, partition, beforeValue }) =>
  (action === DiffAction.remove &&
  type === breaking &&
  partition === SEASONED &&
  !!beforeValue && typeof beforeValue === 'object' && 'deprecated' in beforeValue
    ? risky
    : undefined)

// Verdicts of the removals of a property as the operations see them. The declaration site of a shared
// schema is walked too, and that removal lands in the `components` scope, so it is left out here.
const operationRemovalsOf = (diffs: Diff[], propertyName: string): DiffType[] => diffs
  .filter(diff => diff.action === DiffAction.remove &&
    diff.scope === COMPARE_SCOPE_REQUEST &&
    'beforeDeclarationPaths' in diff &&
    diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === `components.schemas.Shared.properties.${propertyName}`))
  .map(({ type }) => type)

describe('traversalPartitionFunction', () => {
  it('should split a shared difference so each partition carries its own verdict', () => {
    const { diffs } = apiDiff(before, after, {
      traversalPartitionFunction: partitionBySeasonedOperation,
      diffClassificationOverride: downgradeInSeasonedPartition,
    })

    // One removal reached from two operations, now two instances: the seasoned operation reports it as
    // risky, the newcomer still as breaking.
    expect(operationRemovalsOf(diffs, GONE)).toIncludeSameMembers([risky, breaking])

    // The walk of the declaration site itself is reached from no operation, so it stays one instance and
    // keeps the verdict the rules gave it.
    const declarationRemovals = diffs.filter(diff => diff.action === DiffAction.remove &&
      diff.scope !== COMPARE_SCOPE_REQUEST &&
      'beforeDeclarationPaths' in diff &&
      diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === `components.schemas.Shared.properties.${GONE}`))
    expect(declarationRemovals.map(({ type }) => type)).toEqual([breaking])
  })

  it('should leave differences the override declines in one instance per partition, undowngraded', () => {
    const { diffs } = apiDiff(before, after, {
      traversalPartitionFunction: partitionBySeasonedOperation,
      diffClassificationOverride: downgradeInSeasonedPartition,
    })

    // `plain` was never deprecated. Partitioning splits its instances too, but the verdict is decided
    // per node, so neither copy is downgraded.
    expect(operationRemovalsOf(diffs, 'plain')).toEqual([breaking, breaking])
  })

  it('should keep one instance when no partition is named', () => {
    const { diffs } = apiDiff(before, after, { diffClassificationOverride: downgradeInSeasonedPartition })

    expect(operationRemovalsOf(diffs, GONE)).toEqual([breaking])
  })

  it('should keep the partition inside a combiner', () => {
    // Combiner options are compared by a nested traversal of their own, which would otherwise start over
    // from the root partition and lose the one it was reached under.
    const withCombiner = (properties: Record<string, unknown>): unknown => ({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        [SEASONED_PATH]: {
          post: {
            requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Shared' } } } },
            responses: { '200': { description: 'OK' } },
          },
        },
        '/newcomer': {
          post: {
            requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Shared' } } } },
            responses: { '200': { description: 'OK' } },
          },
        },
      },
      components: {
        schemas: { Shared: { oneOf: [{ type: 'object', properties: properties }, { type: 'string' }] } },
      },
    })

    const { diffs } = apiDiff(
      withCombiner({ keep: { type: 'string' }, [GONE]: { type: 'string', deprecated: true } }),
      withCombiner({ keep: { type: 'string' } }),
      {
        traversalPartitionFunction: partitionBySeasonedOperation,
        diffClassificationOverride: downgradeInSeasonedPartition,
      },
    )

    const removals = diffs.filter(diff => diff.action === DiffAction.remove &&
      diff.scope === COMPARE_SCOPE_REQUEST &&
      'beforeDeclarationPaths' in diff &&
      diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === `components.schemas.Shared.oneOf.0.properties.${GONE}`))
    expect(removals.map(({ type }) => type)).toIncludeSameMembers([risky, breaking])
  })

  it('should name the partition of a node that is itself removed', () => {
    const withMethods = (methods: string[]): unknown => ({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/thing': Object.fromEntries(methods.map(method => [method, { responses: { '200': { description: 'OK' } } }])),
      },
    })

    const partitions: (string | undefined)[] = []
    apiDiff(withMethods(['get', 'post']), withMethods(['get']), {
      traversalPartitionFunction: (path) => (
        path?.[0] === 'paths' && path?.[1] === '/thing' && path?.[2] === 'post' ? SEASONED : undefined
      ),
      diffClassificationOverride: ({ action, partition }) => {
        if (action === DiffAction.remove) {
          partitions.push(partition)
        }
        return undefined
      },
    })

    // The operation's own removal is created while its parent is traversed. Without asking the function for
    // the child path, a partition anchored at the operation could never apply to the operation itself.
    expect(partitions).toContain(SEASONED)
  })

  it('should let a failing partition function abort the comparison', () => {
    // Unlike `diffClassificationOverride`, which keeps the computed verdict when it throws. Swallowing
    // a failure here would leave the document split in some places and not others.
    expect(() => apiDiff(before, after, {
      traversalPartitionFunction: () => { throw new Error('partition rule is broken') },
    })).toThrow('partition rule is broken')
  })

  it('should still compare correctly when the partition changes inside a subtree', () => {
    // Naming every node separately is the pathological case the option warns about: results stay
    // correct, but nothing is reused. The fixture is acyclic, where that only costs time.
    const { diffs: perNode } = apiDiff(before, after, {
      traversalPartitionFunction: (path) => path?.join('.') ?? 'root',
    })
    const { diffs: untouched } = apiDiff(before, after, {})

    expect(new Set(perNode.map(({ type }) => type))).toEqual(new Set(untouched.map(({ type }) => type)))
    expect(perNode.length).toBeGreaterThanOrEqual(untouched.length)
  })

  it('should not change the result when the function names every path the same', () => {
    const { diffs: partitioned } = apiDiff(before, after, { traversalPartitionFunction: () => SEASONED })
    const { diffs: untouched } = apiDiff(before, after, {})

    expect(partitioned.map(({ type, scope, action }) => ({ type, scope, action })))
      .toIncludeSameMembers(untouched.map(({ type, scope, action }) => ({ type, scope, action })))
  })
})
