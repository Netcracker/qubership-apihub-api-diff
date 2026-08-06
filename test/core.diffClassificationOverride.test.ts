import 'jest-extended'
import { apiDiff, breaking, risky } from '../src'
import type { DiffClassificationContext } from '../src'
import { DiffAction } from '../src/core'

const createSpec = (properties: Record<string, unknown>): unknown => ({
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/first': {
      post: {
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Shared' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/second': {
      post: {
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Shared' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
  },
  components: { schemas: { Shared: { type: 'object', properties: properties } } },
})

const before = createSpec({ keep: { type: 'string' }, gone: { type: 'string', deprecated: true } })
const after = createSpec({ keep: { type: 'string' } })

const isDeprecatedRemoval = ({ action, type, beforeValue }: DiffClassificationContext): boolean =>
  action === DiffAction.remove &&
  type === breaking &&
  !!beforeValue &&
  typeof beforeValue === 'object' &&
  'deprecated' in beforeValue

describe('diffClassificationOverride', () => {
  it('should replace the classification of the difference it claims', () => {
    const { diffs } = apiDiff(before, after, {
      diffClassificationOverride: (context) => (isDeprecatedRemoval(context) ? risky : undefined),
    })

    expect(diffs.filter(diff => diff.type === breaking)).toHaveLength(0)
    expect(diffs.filter(diff => diff.type === risky).length).toBeGreaterThan(0)
  })

  it('should keep the computed classification when the override declines', () => {
    const { diffs: overridden } = apiDiff(before, after, { diffClassificationOverride: () => undefined })
    const { diffs: untouched } = apiDiff(before, after, {})

    expect(overridden.map(({ type, scope }) => ({ type, scope })))
      .toIncludeSameMembers(untouched.map(({ type, scope }) => ({ type, scope })))
  })

  it('should keep the computed classification when the override throws', () => {
    const errors: string[] = []
    const { diffs: survived } = apiDiff(before, after, {
      diffClassificationOverride: () => { throw new Error('rule is broken') },
      onCreateDiffError: (message) => { errors.push(message) },
    })
    const { diffs: untouched } = apiDiff(before, after, {})

    // Sharing one assignment with the rules would leave every difference `unclassified` instead
    expect(survived.map(({ type, scope }) => ({ type, scope })))
      .toIncludeSameMembers(untouched.map(({ type, scope }) => ({ type, scope })))
    expect(errors.join('\n')).toContain('rule is broken')
  })

  it('should receive the declaration paths and value of the difference', () => {
    const contexts: DiffClassificationContext[] = []
    apiDiff(before, after, {
      diffClassificationOverride: (context) => {
        contexts.push(context)
        return undefined
      },
    })

    const removal = contexts.find(context => isDeprecatedRemoval(context))
    expect(removal).toBeDefined()
    expect(removal?.beforeDeclarationPaths).toEqual([['components', 'schemas', 'Shared', 'properties', 'gone']])
    expect(removal?.beforeValue).toEqual(expect.objectContaining({ deprecated: true }))
  })

  it('should decide once for a difference shared by several operations', () => {
    const seen: (string | undefined)[] = []
    const { diffs } = apiDiff(before, after, {
      diffClassificationOverride: (context) => {
        if (isDeprecatedRemoval(context)) {
          seen.push(context.partition)
        }
        return undefined
      },
    })

    // Both operations reach `Shared` through the same $ref and no partition tells them apart, so the
    // removal is classified once per scope rather than once per operation.
    const removals = diffs.filter(diff =>
      'beforeDeclarationPaths' in diff &&
      diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === 'components.schemas.Shared.properties.gone'),
    )
    expect(removals).toHaveLength(seen.length)
    expect(seen.every(partition => partition === undefined)).toBe(true)
  })
})
