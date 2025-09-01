import { apiDiff, CompareOptions } from '../src'
import { TEST_DIFF_FLAG, TEST_SYNTHETIC_TITLE_FLAG, TEST_ORIGINS_FLAG } from './helper'
import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { diffsMatcher } from './helper/matchers'

// Helper function for OpenAPI version change assertion
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
  test('empty-schema', () => {
    // Load the before and after files
    const beforePath = './test/helper/resources/3_0-to-3_1/empty-schema/before.yaml'
    const afterPath = './test/helper/resources/3_0-to-3_1/empty-schema/after.yaml'
    
    const beforeSource = load(readFileSync(beforePath).toString())
    const afterSource = load(readFileSync(afterPath).toString())
    
    // Call apiDiff
    const { diffs } = apiDiff(beforeSource, afterSource, {
      ...TEST_NORMALIZE_OPTIONS,
      beforeSource,
      afterSource,
    })
    
    // Check the result - expecting changes from empty schema {} to typed schemas
    expect(diffs).toEqual(diffsMatcher([
      expectOpenApiVersionChange(),
    ]))
  })  

  test('add-overriden-description', () => {
    const beforePath = './test/helper/resources/3_0-to-3_1/add-overriden-description/before.yaml'
    const afterPath = './test/helper/resources/3_0-to-3_1/add-overriden-description/after.yaml'
    
    const beforeSource = load(readFileSync(beforePath).toString())
    const afterSource = load(readFileSync(afterPath).toString())
    
    const { diffs } = apiDiff(beforeSource, afterSource, {
      ...TEST_NORMALIZE_OPTIONS,
      beforeSource,
      afterSource,
    })    
    
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

  describe('nullable and null type', () => {
    test('nullable-to-union', () => {
      // Load the before and after files
      const beforePath = './test/helper/resources/3_0-to-3_1/nullable-to-union/before.yaml'
      const afterPath = './test/helper/resources/3_0-to-3_1/nullable-to-union/after.yaml'
      
      const beforeSource = load(readFileSync(beforePath).toString())
      const afterSource = load(readFileSync(afterPath).toString())
      
      // Call apiDiff
      const { diffs } = apiDiff(beforeSource, afterSource, {
        ...TEST_NORMALIZE_OPTIONS,
        beforeSource,
        afterSource,
      })
      
      expect(diffs.length).toBe(1)
  
           expect(diffs).toEqual(diffsMatcher([
         expectOpenApiVersionChange(),      
       ]))
    })

    test('nullable-to-null', () => {
      // Load the before and after files
      const beforePath = './test/helper/resources/3_0-to-3_1/nullable-to-null/before.yaml'
      const afterPath = './test/helper/resources/3_0-to-3_1/nullable-to-null/after.yaml'
      
      const beforeSource = load(readFileSync(beforePath).toString())
      const afterSource = load(readFileSync(afterPath).toString())
      
      // Call apiDiff
      const { diffs } = apiDiff(beforeSource, afterSource, {
        ...TEST_NORMALIZE_OPTIONS,
        beforeSource,
        afterSource,
      })
      
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
  })  
})
