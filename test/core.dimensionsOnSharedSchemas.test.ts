import { apiDiff, breaking, DiffAction, DiffClassificationRule, risky } from '../src'
import type { Diff, DiffType, TraversalDimension } from '../src'

import singleMethodResponseBefore from './helper/resources/shared-schema-routes/single-method-response/before.json'
import singleMethodResponseAfter from './helper/resources/shared-schema-routes/single-method-response/after.json'

import singleMethodRequestResponseBefore
  from './helper/resources/shared-schema-routes/single-method-request-response/before.json'
import singleMethodRequestResponseAfter
  from './helper/resources/shared-schema-routes/single-method-request-response/after.json'

import multipleMethodsResponseBefore
  from './helper/resources/shared-schema-routes/multiple-methods-response/before.json'
import multipleMethodsResponseAfter
  from './helper/resources/shared-schema-routes/multiple-methods-response/after.json'

import multipleMethodsResponseRefBefore
  from './helper/resources/shared-schema-routes/multiple-methods-response-ref/before.json'
import multipleMethodsResponseRefAfter
  from './helper/resources/shared-schema-routes/multiple-methods-response-ref/after.json'

import multipleMethodsRequestResponseRefBefore
  from './helper/resources/shared-schema-routes/multiple-methods-request-response-ref/before.json'
import multipleMethodsRequestResponseRefAfter
  from './helper/resources/shared-schema-routes/multiple-methods-request-response-ref/after.json'

import { diffsMatcher } from './helper/matchers'
import type { RecursiveMatcher } from './helper/matchers'

type PATH_ENTRY = [string, string, string]

const GET_PATH1: PATH_ENTRY = ['paths', '/path1', 'get']
const POST_PATH1: PATH_ENTRY = ['paths', '/path1', 'post']

// The policy this suite compares under: some routes are marked, and a marked route softens a breaking
// change to risky. Nothing of it is known to the library
const SEASONING = 'seasoning'
const SEASONED = 'seasoned'

const downgradeSeasoned: DiffClassificationRule = ({ type, dimensions }) => (
  type === breaking && dimensions[SEASONING] === SEASONED ? risky : undefined
)

function seasonedAtPaths(data: PATH_ENTRY[]): TraversalDimension['valueAt'] {
  return (path?: PropertyKey[]) => {
    if (path?.length !== 3) {
      return undefined
    }
    return data.some(entry =>
      entry.every((el, i) => path?.[i] === el),
    ) ? SEASONED : undefined
  }
}

const RESPONSE_SCHEMA_TYPE = ['responses', '200', 'content', 'application/json', 'schema', 'type']

/** One expected difference. `declaredAt` pins which operation it was reached through, where that matters. */
function replacedIn(scope: string, type: DiffType, declaredAt?: PATH_ENTRY): RecursiveMatcher<Diff> {
  const paths = declaredAt ? [[...declaredAt, ...RESPONSE_SCHEMA_TYPE]] : undefined
  return expect.objectContaining({
    action: DiffAction.replace,
    scope: scope,
    type: type,
    ...paths ? { beforeDeclarationPaths: paths, afterDeclarationPaths: paths } : {},
  })
}

function diffsOf(before: unknown, after: unknown, marked: PATH_ENTRY[]): Diff[] {
  const { diffs } = apiDiff(before, after, {
    dimensions: [{ name: SEASONING, valueAt: seasonedAtPaths(marked) }],
    classificationRules: [downgradeSeasoned],
  })
  return diffs
}

/**
 * Dimension splitting on documents that share a schema between operations, which is what the mechanism
 * exists for. Both the dimension and the verdict drawn from it are a caller policy, played here by an
 * invented one: the library carries the value and never reads it.
 * Every case is the same comparison under a different set of marked routes, so the table is the spec: what
 * the mark is on, and which differences come out of it.
 */
describe('routes that disagree about a dimension', () => {
  it.each<{ desc: string, before: unknown, after: unknown, marked: PATH_ENTRY[], expected: RecursiveMatcher<Diff>[] }>([
    // A schema written out per operation: marking one route softens only its own difference
    {
      desc: 'softens the marked method and leaves the other breaking',
      before: multipleMethodsResponseBefore, after: multipleMethodsResponseAfter,
      marked: [GET_PATH1],
      expected: [
        replacedIn('response', risky, GET_PATH1),
        replacedIn('response', breaking, POST_PATH1),
      ],
    },
    {
      desc: 'softens both methods when both are marked',
      before: multipleMethodsResponseBefore, after: multipleMethodsResponseAfter,
      marked: [GET_PATH1, POST_PATH1],
      expected: [
        replacedIn('response', risky, GET_PATH1),
        replacedIn('response', risky, POST_PATH1),
      ],
    },
    // One schema behind a $ref: the routes split it, and the walk of the declaration site adds its own
    {
      desc: 'splits a shared response schema, and the declaration site keeps the rules verdict',
      before: multipleMethodsResponseRefBefore, after: multipleMethodsResponseRefAfter,
      marked: [GET_PATH1],
      expected: [
        replacedIn('response', risky),
        replacedIn('response', breaking),
        replacedIn('components', breaking),
      ],
    },
    {
      desc: 'keeps one shared response instance when both routes agree',
      before: multipleMethodsResponseRefBefore, after: multipleMethodsResponseRefAfter,
      marked: [GET_PATH1, POST_PATH1],
      expected: [
        replacedIn('response', risky),
        replacedIn('components', breaking),
      ],
    },
    // The same $ref reached from request and response alike, so each scope splits on its own
    {
      desc: 'splits request and response separately when one route is marked',
      before: multipleMethodsRequestResponseRefBefore, after: multipleMethodsRequestResponseRefAfter,
      marked: [GET_PATH1],
      expected: [
        replacedIn('request', risky),
        replacedIn('request', breaking),
        replacedIn('response', risky),
        replacedIn('response', breaking),
        replacedIn('components', breaking),
      ],
    },
    {
      desc: 'keeps one instance per scope when both routes agree',
      before: multipleMethodsRequestResponseRefBefore, after: multipleMethodsRequestResponseRefAfter,
      marked: [GET_PATH1, POST_PATH1],
      expected: [
        replacedIn('request', risky),
        replacedIn('response', risky),
        replacedIn('components', breaking),
      ],
    },
  ])('$desc', ({ before, after, marked, expected }) => {
    expect(diffsOf(before, after, marked)).toEqual(diffsMatcher(expected))
  })
})

/**
 * Nothing disagrees here — every route carries the same value — so these pin the other half: a rule reads
 * the dimension and softens what it finds, on a document where no splitting can be involved.
 */
describe('a dimension every route agrees about', () => {
  it.each<{ desc: string, before: unknown, after: unknown, expected: RecursiveMatcher<Diff>[] }>([
    {
      desc: 'softens a response change',
      before: singleMethodResponseBefore, after: singleMethodResponseAfter,
      expected: [replacedIn('response', risky)],
    },
    {
      desc: 'softens a request and a response change alike',
      before: singleMethodRequestResponseBefore, after: singleMethodRequestResponseAfter,
      expected: [replacedIn('response', risky), replacedIn('request', risky)],
    },
  ])('$desc', ({ before, after, expected }) => {
    const { diffs } = apiDiff(before, after, {
      dimensions: [{ name: SEASONING, valueAt: () => SEASONED }],
      classificationRules: [downgradeSeasoned],
    })
    expect(diffs).toEqual(diffsMatcher(expected))
  })
})
