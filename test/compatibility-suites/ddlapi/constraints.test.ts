import { TEST_SPEC_TYPE_DDL_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { breaking, DiffAction, nonBreaking, risky } from '../../../src'
import { diffsMatcher } from '../../helper/matchers'
import { compareFiles, TEST_DEFAULTS_DECLARATION_PATHS } from '../utils'

const SUITE_ID = 'constraints'

const PRIMARY_KEY_PATH = ['schemas', 0, 'tables', 0, 'primaryKey']
const SECOND_TABLE_FOREIGN_KEY_PATH = ['schemas', 0, 'tables', 1, 'foreignKeys', 0]
const THIRD_TABLE_FOREIGN_KEY_PATH = ['schemas', 0, 'tables', 2, 'foreignKeys', 0]

describe('DDLApi Constraints: ', () => {
  test('add-primary-key', async () => {
    const testId = 'add-primary-key'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [PRIMARY_KEY_PATH],
        type: risky,
      }),
    ]))
  })

  test('remove-primary-key', async () => {
    const testId = 'remove-primary-key'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [PRIMARY_KEY_PATH],
        type: breaking,
      }),
    ]))
  })

  test('add-primary-key-column', async () => {
    const testId = 'add-primary-key-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...PRIMARY_KEY_PATH, 'parts', 1]],
        type: breaking,
      }),
    ]))
  })

  test('remove-primary-key-column', async () => {
    const testId = 'remove-primary-key-column'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...PRIMARY_KEY_PATH, 'parts', 1]],
        type: breaking,
      }),
    ]))
  })

  test('change-primary-key-columns', async () => {
    const testId = 'change-primary-key-columns'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...PRIMARY_KEY_PATH, 'parts', 0]],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...PRIMARY_KEY_PATH, 'parts', 0]],
        type: breaking,
      }),
    ]))
  })

  test('add-foreign-key', async () => {
    const testId = 'add-foreign-key'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [SECOND_TABLE_FOREIGN_KEY_PATH],
        type: risky,
      }),
    ]))
  })

  test('remove-foreign-key', async () => {
    const testId = 'remove-foreign-key'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SECOND_TABLE_FOREIGN_KEY_PATH],
        type: breaking,
      }),
    ]))
  })

  test('change-foreign-key-columns', async () => {
    const testId = 'change-foreign-key-columns'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SECOND_TABLE_FOREIGN_KEY_PATH],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [SECOND_TABLE_FOREIGN_KEY_PATH],
        type: breaking,
      }),
    ]))
  })

  test('change-referenced-table', async () => {
    const testId = 'change-referenced-table'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [THIRD_TABLE_FOREIGN_KEY_PATH],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [THIRD_TABLE_FOREIGN_KEY_PATH],
        type: breaking,
      }),
    ]))
  })

  test('change-referenced-columns', async () => {
    const testId = 'change-referenced-columns'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SECOND_TABLE_FOREIGN_KEY_PATH],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [SECOND_TABLE_FOREIGN_KEY_PATH],
        type: breaking,
      }),
    ]))
  })
})
