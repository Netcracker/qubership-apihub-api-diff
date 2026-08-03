import { compareFiles } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, DiffAction, nonBreaking } from '../../../src'
import { TEST_SPEC_TYPE_DDL_API } from '@netcracker/qubership-apihub-compatibility-suites'

const SUITE_ID = 'table'

describe('DDLApi Table: ', () => {
  test('add-table', async () => {
    const testId = 'add-table'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    // console.log(result)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['schemas', 0, 'tables', 1]],
        type: nonBreaking,
        // scope: COMPARE_SCOPE_ROOT
      }),
    ]))
  })

  test('remove-table', async () => {
    const testId = 'remove-table'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 1]],
        type: breaking
      }),
    ]))
  })

  test('add-table-description', async () => {
    const testId = 'add-table-description'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'attrs', 0]],
        type: annotation
      }),
    ]))
  })

  test('update-table-description', async () => {
    const testId = 'update-table-description'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'attrs', 0, 'text']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'attrs', 0, 'text']],
        type: annotation
      }),
    ]))
  })

  test('remove-table-description', async () => {
    const testId = 'remove-table-description'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'attrs', 0]],
        type: annotation
      }),
    ]))
  })

  test('add-table-non-default-schema', async () => {
    const testId = 'add-table-non-default-schema'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['schemas', 0, 'tables', 1]],
        type: nonBreaking
      }),
    ]))
  })
})
