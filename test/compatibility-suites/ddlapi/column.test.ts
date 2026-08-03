import { compareFiles } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, DiffAction, nonBreaking, unclassified } from '../../../src'
import { TEST_SPEC_TYPE_DDL_API } from '@netcracker/qubership-apihub-compatibility-suites'

const SUITE_ID = 'column'

describe('DDLApi Column: ', () => {

  test('add-nullable-column', async () => {
    const testId = 'add-nullable-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 1]],
        type: nonBreaking
      }),
    ]))
  })

  test('add-not-null-column', async () => {
    const testId = 'add-not-null-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 1]],
        type: nonBreaking
      }),
    ]))
  })

  test('add-not-null-column-with-default', async () => {
    const testId = 'add-not-null-column-with-default'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 1]],
        type: nonBreaking
      }),
    ]))
  })

  test('add-nullable-column-with-default', async () => {
    const testId = 'add-nullable-column-with-default'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 1]],
        type: nonBreaking
      }),
    ]))
  })

  test('remove-column', async () => {
    const testId = 'remove-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 1]],
        type: breaking
      }),
    ]))
  })

  //TODO:check why "beforeDeclarationPaths": [["test-cs-defaults"]]
  test.skip('nullable-to-not-null-column', async () => {
    const testId = 'nullable-to-not-null-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'null']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'null']],
        type: nonBreaking
      }),
    ]))
  })

  //TODO:check why "afterDeclarationPaths": [["test-cs-defaults"]]
  test.skip('not-null-to-nullable-column', async () => {
    const testId = 'not-null-to-nullable-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'null']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'null']],
        type: nonBreaking
      }),
    ]))
  })

  test('add-default', async () => {
    const testId = 'add-default'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'default']],
        type: nonBreaking
      }),
    ]))
  })

  test('remove-default', async () => {
    const testId = 'remove-default'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'default']],
        type: nonBreaking
      }),
    ]))
  })

  test('update-default', async () => {
    const testId = 'update-default'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'default', 'value']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'default', 'value']],
        type: nonBreaking
      }),
    ]))
  })

  test('add-generated-column', async () => {
    const testId = 'add-generated-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 2]],
        type: nonBreaking
      }),
    ]))
  })

  //actual result doesn't match with the expected from the excel file
  test.skip('add-identity-column', async () => {
    const testId = 'add-identity-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0]],
        type: nonBreaking
      }),
    ]))
  })

  test('change-identity-to-always', async () => {
    const testId = 'change-identity-to-always'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0, 'generation']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0, 'generation']],
        type: unclassified
      }),
    ]))
  })

  //actual result doesn't match with the expected from the excel file
  test.skip('change-identity-to-by-default', async () => {
    const testId = 'change-identity-to-by-default'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0, 'generation']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0, 'generation']],
        type: nonBreaking
      }),
    ]))
  })

  //actual result doesn't match with the expected from the excel file
  test.skip('add-collation', async () => {
    const testId = 'add-collation'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0]],
        type: unclassified
      }),
    ]))
  })

  //actual result doesn't match with the expected from the excel file
  test.skip('update-collation', async () => {
    const testId = 'update-collation'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0, 'value']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0, 'value']],
        type: unclassified
      }),
    ]))
  })

  //actual result doesn't match with the expected from the excel file
  test.skip('remove-collation', async () => {
    const testId = 'remove-collation'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0]],
        type: unclassified
      }),
    ]))
  })

  test('add-column-comment', async () => {
    const testId = 'add-column-comment'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0]],
        type: annotation
      }),
    ]))
  })

  test('remove-column-comment', async () => {
    const testId = 'remove-column-comment'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0]],
        type: annotation
      }),
    ]))
  })

  test('update-column-comment', async () => {
    const testId = 'update-column-comment'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0, 'text']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'attrs', 0, 'text']],
        type: annotation
      }),
    ]))
  })
})
