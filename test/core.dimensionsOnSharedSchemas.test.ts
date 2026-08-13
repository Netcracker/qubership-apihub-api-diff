import { apiDiff, breaking, DiffAction, DiffClassificationRule, risky, TraversalDimension } from '../src'

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

// Dimension splitting on documents that share a schema between operations, which is what the mechanism
// exists for. Both the dimension and the verdict drawn from it are a caller policy, played here by an
// invented one: the library carries the value and never reads it
describe('routes that disagree about a dimension', () => {
  it('should diff from GET has risky type when every route is marked', async () => {
    const { diffs } = apiDiff(
      singleMethodResponseBefore,
      singleMethodResponseAfter,
      {
        dimensions: [{ name: SEASONING, valueAt: () => SEASONED }],
        classificationRules: [downgradeSeasoned],
      },
    )
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: risky,
      }),
    ]))
  })

  it('should mark both request and response as risky for single method when every route is marked', async () => {
    const { diffs } = apiDiff(
      singleMethodRequestResponseBefore,
      singleMethodRequestResponseAfter,
      {
        dimensions: [{ name: SEASONING, valueAt: () => SEASONED }],
        classificationRules: [downgradeSeasoned],
      },
    )
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: risky,
      }),
      expect.objectContaining({
        scope: 'request',
        action: DiffAction.replace,
        type: risky,
      }),
    ]))
  })

  it('should mark GET method as risky and POST as breaking when only GET is marked', async () => {
    const { diffs } = apiDiff(
      multipleMethodsResponseBefore,
      multipleMethodsResponseAfter,
      {
        dimensions: [{ name: SEASONING, valueAt: seasonedAtPaths([GET_PATH1]) }],
        classificationRules: [downgradeSeasoned],
      })
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...GET_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        beforeDeclarationPaths: [[...GET_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        scope: 'response',
        type: risky,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...POST_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        beforeDeclarationPaths: [[...POST_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        scope: 'response',
        type: breaking,
      }),
    ]))
  })

  it('should mark both GET and POST methods as risky when both are marked', async () => {
    const { diffs } = apiDiff(
      multipleMethodsResponseBefore,
      multipleMethodsResponseAfter,
      {
        dimensions: [{ name: SEASONING, valueAt: seasonedAtPaths([GET_PATH1, POST_PATH1]) }],
        classificationRules: [downgradeSeasoned],
      })
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...POST_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        beforeDeclarationPaths: [[...POST_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        scope: 'response',
        type: risky,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...GET_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        beforeDeclarationPaths: [[...GET_PATH1, 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        scope: 'response',
        type: risky,
      }),
    ]))
  })

  it('should have two response diffs and one components diff when only GET is marked with refs', async () => {
    const { diffs } = apiDiff(
      multipleMethodsResponseRefBefore,
      multipleMethodsResponseRefAfter,
      {
        dimensions: [{ name: SEASONING, valueAt: seasonedAtPaths([GET_PATH1]) }],
        classificationRules: [downgradeSeasoned],
      })
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'response',
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'response',
        type: risky,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'components',
        type: breaking,
      }),
    ]))
  })

  it('should have one response diff and one components diff when both methods are marked and share a ref', async () => {
    const { diffs } = apiDiff(
      multipleMethodsResponseRefBefore,
      multipleMethodsResponseRefAfter,
      {
        dimensions: [{ name: SEASONING, valueAt: seasonedAtPaths([GET_PATH1, POST_PATH1]) }],
        classificationRules: [downgradeSeasoned],
      })
    expect(diffs).toEqual(diffsMatcher([
      // get + post
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'response',
        type: risky,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'components',
        type: breaking,
      }),
    ]))
  })

  it('should mark POST as breaking and GET as risky for both request and response when only GET is marked with refs', async () => {
    const { diffs } = apiDiff(
      multipleMethodsRequestResponseRefBefore,
      multipleMethodsRequestResponseRefAfter,
      {
        dimensions: [{ name: SEASONING, valueAt: seasonedAtPaths([GET_PATH1]) }],
        classificationRules: [downgradeSeasoned],
      })
    expect(diffs).toEqual(diffsMatcher([
      // post
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'request',
        type: breaking,
      }),
      // post
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'response',
        type: breaking,
      }),
      // get
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'request',
        type: risky,
      }),
      // get
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'response',
        type: risky,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'components',
        type: breaking,
      }),
    ]))
  })

  it('should mark both request and response as risky when both methods are marked and share a ref', async () => {
    const { diffs } = apiDiff(
      multipleMethodsRequestResponseRefBefore,
      multipleMethodsRequestResponseRefAfter,
      {
        dimensions: [{ name: SEASONING, valueAt: seasonedAtPaths([GET_PATH1, POST_PATH1]) }],
        classificationRules: [downgradeSeasoned],
      })
    expect(diffs).toEqual(diffsMatcher([
      // get + post
      expect.objectContaining({
        scope: 'request',
        action: DiffAction.replace,
        type: risky,
      }),
      // get + post
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: risky,
      }),
      expect.objectContaining({
        scope: 'components',
        action: DiffAction.replace,
        type: breaking,
      }),
    ]))
  })

})
