import { apiDiff, CompareOptions } from '../src'
import { TEST_DIFF_FLAG, TEST_SYNTHETIC_TITLE_FLAG, TEST_ORIGINS_FLAG } from './helper'
import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { diffsMatcher } from './helper/matchers'

const TEST_NORMALIZE_OPTIONS: CompareOptions = {
  validate: true,
  liftCombiners: true,
  syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  unify: true,
  allowNotValidSyntheticChanges: true,
}

describe('OpenAPI 3.0 to 3.1 Migration Tests', () => {
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
      expect.objectContaining({
        action: 'replace',
        afterDeclarationPaths: [['openapi']],
        afterValue: '3.1.0',
        beforeDeclarationPaths: [['openapi']],
        beforeValue: '3.0.3',
        type: 'annotation',
      }),
    ]))
  })
})
