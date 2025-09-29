import { apiDiff, CompareOptions } from '../src'
import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from './helper'
import { diffsMatcher } from './helper/matchers'

import addOverridenDescriptionBefore from './helper/resources/30-to-31/add-overriden-description/before.json'
import addOverridenDescriptionAfter from './helper/resources/30-to-31/add-overriden-description/after.json'

import combinerToOtherTypeBefore from './helper/resources/30-to-31/combiner-to-other-type/before.json'
import combinerToOtherTypeAfter from './helper/resources/30-to-31/combiner-to-other-type/after.json'

import emptySchemaBefore from './helper/resources/30-to-31/empty-schema/before.json'
import emptySchemaAfter from './helper/resources/30-to-31/empty-schema/after.json'

import nullableToAnyOfBefore from './helper/resources/30-to-31/nullable-to-any-of/before.json'
import nullableToAnyOfAfter from './helper/resources/30-to-31/nullable-to-any-of/after.json'

import nullableToNullBefore from './helper/resources/30-to-31/nullable-to-null/before.json'
import nullableToNullAfter from './helper/resources/30-to-31/nullable-to-null/after.json'

import nullableToUnionBefore from './helper/resources/30-to-31/nullable-to-union/before.json'
import nullableToUnionAfter from './helper/resources/30-to-31/nullable-to-union/after.json'

import nullableToUnionWithRefBefore from './helper/resources/30-to-31/nullable-to-union-with-ref/before.json'
import nullableToUnionWithRefAfter from './helper/resources/30-to-31/nullable-to-union-with-ref/after.json'

const expectOpenApiVersionChange = (fromVersion: string = '3.0.4', toVersion: string = '3.1.0') =>
  expect.objectContaining({
    action: 'replace',
    afterDeclarationPaths: [['openapi']],
    afterValue: toVersion,
    beforeDeclarationPaths: [['openapi']],
    beforeValue: fromVersion,
    type: 'annotation',
  })

const TEST_NORMALIZE_OPTIONS: CompareOptions = {
  validate: true,
  liftCombiners: true,
  syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  unify: true,
  allowNotValidSyntheticChanges: true,
}

describe('OpenAPI 3.0 to 3.1 Comparison Tests', () => {
  test('empty schemas should have no difference', () => {
    const { diffs } = apiDiff(emptySchemaBefore, emptySchemaAfter, TEST_NORMALIZE_OPTIONS)

    // only openapi version change
    expect(diffs).toEqual(diffsMatcher([
      expectOpenApiVersionChange(),
    ]))
  })

  test('could compare with overridden description via reference object', () => {
    const { diffs } = apiDiff(addOverridenDescriptionBefore, addOverridenDescriptionAfter, TEST_NORMALIZE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expectOpenApiVersionChange(),
      expect.objectContaining({
        action: 'replace',
        beforeValue: 'response description from components',
        afterValue: 'response description override',
        afterDeclarationPaths: [['paths', '/path1', 'post', 'responses', '200', 'description']],
        beforeDeclarationPaths: [['components', 'responses', 'response200', 'description']],
        type: 'annotation',
      }),
    ]))
  })

  describe('Comparison nullable and null type', () => {
    test('could compare nullable to anyOf', () => {
      const { diffs } = apiDiff(nullableToAnyOfBefore, nullableToAnyOfAfter, TEST_NORMALIZE_OPTIONS)

      expect(diffs.length).toBe(1)
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
      ]))
    })

    test('could compare nullable to union', () => {
      const { diffs } = apiDiff(nullableToUnionBefore, nullableToUnionAfter, TEST_NORMALIZE_OPTIONS)

      expect(diffs.length).toBe(1)
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
      ]))
    })

    test('could compare combiner to other type', () => {
      const { diffs } = apiDiff(combinerToOtherTypeBefore, combinerToOtherTypeAfter, TEST_NORMALIZE_OPTIONS)

      expect(diffs.length).toBe(1)
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
      ]))
    })

    test('could compare nullable to null', () => {
      const { diffs } = apiDiff(nullableToNullBefore, nullableToNullAfter, TEST_NORMALIZE_OPTIONS)

      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
        expect.objectContaining({
          action: 'remove',
          //TODO: validate declaration path
          beforeDeclarationPaths: [['paths', '/path1', 'get', 'responses', '200', 'content', 'application/json', 'schema']],
          scope: 'response',
          type: 'non-breaking',
        }),
      ]))
    })

    test('could compare nullable to union with ref', () => {
      const { diffs } = apiDiff(nullableToUnionWithRefBefore, nullableToUnionWithRefAfter, TEST_NORMALIZE_OPTIONS)

      expect(diffs.length).toBe(1)
      expect(diffs).toEqual(diffsMatcher([
        expectOpenApiVersionChange(),
      ]))
    })
  })
})
