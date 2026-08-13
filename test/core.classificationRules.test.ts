import 'jest-extended'
import { apiDiff, breaking, nonBreaking, risky } from '../src'
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

describe('classificationRules', () => {
  it('should replace the classification of the difference a rule claims', () => {
    const { diffs } = apiDiff(before, after, {
      classificationRules: [(context) => (isDeprecatedRemoval(context) ? risky : undefined)],
    })

    expect(diffs.filter(diff => diff.type === breaking)).toHaveLength(0)
    expect(diffs.filter(diff => diff.type === risky).length).toBeGreaterThan(0)
  })

  it('should keep the computed classification when every rule declines', () => {
    const { diffs: offered } = apiDiff(before, after, { classificationRules: [() => undefined] })
    const { diffs: untouched } = apiDiff(before, after, {})

    expect(offered.map(({ type, scope }) => ({ type, scope })))
      .toIncludeSameMembers(untouched.map(({ type, scope }) => ({ type, scope })))
  })

  it('should keep the computed classification when a rule throws', () => {
    const errors: string[] = []
    const { diffs: survived } = apiDiff(before, after, {
      classificationRules: [() => { throw new Error('rule is broken') }],
      onCreateDiffError: (message) => { errors.push(message) },
    })
    const { diffs: untouched } = apiDiff(before, after, {})

    // Sharing one assignment with the spec rules would leave every difference `unclassified` instead
    expect(survived.map(({ type, scope }) => ({ type, scope })))
      .toIncludeSameMembers(untouched.map(({ type, scope }) => ({ type, scope })))
    expect(errors.join('\n')).toContain('rule is broken')
  })

  it('should guard each rule on its own, keeping the verdict a throwing one interrupted', () => {
    const errors: string[] = []
    const { diffs } = apiDiff(before, after, {
      classificationRules: [
        (context) => (isDeprecatedRemoval(context) ? risky : undefined),
        () => { throw new Error('rule is broken') },
        (context) => (context.type === risky ? nonBreaking : undefined),
      ],
      onCreateDiffError: (message) => { errors.push(message) },
    })

    // One guard around the whole loop would lose the first verdict and skip every rule after the throw
    expect(diffs.filter(diff => diff.type === nonBreaking).length).toBeGreaterThan(0)
    expect(diffs.filter(diff => diff.type === risky)).toHaveLength(0)
    expect(errors.join('\n')).toContain('rule is broken')
  })

  it('should consult the rules in the order they are given', () => {
    const { diffs } = apiDiff(before, after, {
      classificationRules: [
        (context) => (isDeprecatedRemoval(context) ? risky : undefined),
        (context) => (context.type === risky ? breaking : undefined),
      ],
    })

    // The second rule sees what the first left, so the last word on a claimed difference is its own
    expect(diffs.filter(diff => diff.type === risky)).toHaveLength(0)
  })

  it('should receive the declaration paths and value of the difference', () => {
    const contexts: DiffClassificationContext[] = []
    apiDiff(before, after, {
      classificationRules: [(context) => {
        contexts.push(context)
        return undefined
      }],
    })

    const removal = contexts.find(context => isDeprecatedRemoval(context))
    expect(removal).toBeDefined()
    expect(removal?.beforeDeclarationPaths).toEqual([['components', 'schemas', 'Shared', 'properties', 'gone']])
    expect(removal?.beforeValue).toEqual(expect.objectContaining({ deprecated: true }))
  })

  it('should decide once for a difference shared by several operations', () => {
    const seen: DiffClassificationContext['dimensions'][] = []
    const { diffs } = apiDiff(before, after, {
      classificationRules: [(context) => {
        if (isDeprecatedRemoval(context)) {
          seen.push(context.dimensions)
        }
        return undefined
      }],
    })

    // Both operations reach `Shared` through the same $ref and no dimension tells them apart, so the
    // removal is classified once per scope rather than once per operation.
    const removals = diffs.filter(diff =>
      'beforeDeclarationPaths' in diff &&
      diff.beforeDeclarationPaths.some(jsonPath => jsonPath.join('.') === 'components.schemas.Shared.properties.gone'),
    )
    expect(removals).toHaveLength(seen.length)
    expect(seen.every(dimensions => Object.keys(dimensions).length === 0)).toBe(true)
  })
})
