import { TEST_SPEC_TYPE_DDL_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { breaking, DiffAction, nonBreaking, risky, unclassified } from '../../../src'
import { diffsMatcher } from '../../helper/matchers'
import { compareFiles } from '../utils'

const SUITE_ID = 'column-type'

const COLUMN_TYPE_PATH = ['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type']
const TYPE_PATH = [...COLUMN_TYPE_PATH, 'type']
const SIZE_PATH = [...COLUMN_TYPE_PATH, 'size']
const PRECISION_PATH = [...COLUMN_TYPE_PATH, 'precision']
const SCALE_PATH = [...COLUMN_TYPE_PATH, 'scale']
const ENUM_PATH = ['schemas', 0, 'objects', 0]

describe('DDLApi Column Type: ', () => {
  test('widen-smallint-to-integer', async () => {
    const testId = 'widen-smallint-to-integer'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('widen-integer-to-bigint', async () => {
    const testId = 'widen-integer-to-bigint'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('widen-bigint-to-numeric', async () => {
    const testId = 'widen-bigint-to-numeric'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('widen-integer-to-numeric', async () => {
    const testId = 'widen-integer-to-numeric'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('widen-float-to-double', async () => {
    const testId = 'widen-float-to-double'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('float-to-decimal', async () => {
    const testId = 'float-to-decimal'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [PRECISION_PATH],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [SCALE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('numeric-to-float', async () => {
    const testId = 'numeric-to-float'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [PRECISION_PATH],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SCALE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('numeric-to-integer', async () => {
    const testId = 'numeric-to-integer'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [PRECISION_PATH],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SCALE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('integer-to-varchar', async () => {
    const testId = 'integer-to-varchar'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [SIZE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('varchar-to-integer', async () => {
    const testId = 'varchar-to-integer'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SIZE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('text-to-varchar-unlimited', async () => {
    const testId = 'text-to-varchar-unlimited'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('text-to-varchar-limited', async () => {
    const testId = 'text-to-varchar-limited'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: risky,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [SIZE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('varchar-to-text', async () => {
    const testId = 'varchar-to-text'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [SIZE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('increase-varchar-size', async () => {
    const testId = 'increase-varchar-size'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [SIZE_PATH],
        afterDeclarationPaths: [SIZE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('decrease-varchar-size', async () => {
    const testId = 'decrease-varchar-size'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [SIZE_PATH],
        afterDeclarationPaths: [SIZE_PATH],
        type: risky,
      }),
    ]))
  })

  test('increase-decimal-precision', async () => {
    const testId = 'increase-decimal-precision'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [PRECISION_PATH],
        afterDeclarationPaths: [PRECISION_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('decrease-decimal-precision', async () => {
    const testId = 'decrease-decimal-precision'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [PRECISION_PATH],
        afterDeclarationPaths: [PRECISION_PATH],
        type: breaking,
      }),
    ]))
  })

  test('increase-decimal-scale', async () => {
    const testId = 'increase-decimal-scale'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [SCALE_PATH],
        afterDeclarationPaths: [SCALE_PATH],
        type: risky,
      }),
    ]))
  })

  test('decrease-decimal-scale', async () => {
    const testId = 'decrease-decimal-scale'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [SCALE_PATH],
        afterDeclarationPaths: [SCALE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('date-to-timestamp', async () => {
    const testId = 'date-to-timestamp'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('timestamp-to-date', async () => {
    const testId = 'timestamp-to-date'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: nonBreaking,
      }),
    ]))
  })

  test('uuid-to-text', async () => {
    const testId = 'uuid-to-text'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: risky,
      }),
    ]))
  })

  test('text-to-uuid', async () => {
    const testId = 'text-to-uuid'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('json-to-jsonb', async () => {
    const testId = 'json-to-jsonb'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: risky,
      }),
    ]))
  })

  test('jsonb-to-json', async () => {
    const testId = 'jsonb-to-json'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: risky,
      }),
    ]))
  })

  test('json-to-text', async () => {
    const testId = 'json-to-text'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: risky,
      }),
    ]))
  })

  test('text-to-json', async () => {
    const testId = 'text-to-json'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('bool-to-int', async () => {
    const testId = 'bool-to-int'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('int-to-bool', async () => {
    const testId = 'int-to-bool'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('enum-to-text', async () => {
    const testId = 'enum-to-text'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...ENUM_PATH, 'type']],
        afterDeclarationPaths: [TYPE_PATH],
        type: risky,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...ENUM_PATH, 'values']],
        type: unclassified,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [ENUM_PATH],
        type: unclassified,
      }),
    ]))
  })

  test('text-to-enum', async () => {
    const testId = 'text-to-enum'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [[...ENUM_PATH, 'type']],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...ENUM_PATH, 'values']],
        type: unclassified,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [ENUM_PATH],
        type: unclassified,
      }),
    ]))
  })

  test('binary-to-text', async () => {
    const testId = 'binary-to-text'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('text-to-binary', async () => {
    const testId = 'text-to-binary'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('narrow-cross-family-to-text', async () => {
    const testId = 'narrow-cross-family-to-text'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: breaking,
      }),
    ]))
  })

  test('narrow-bigint-to-smallint', async () => {
    const testId = 'narrow-bigint-to-smallint'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: risky,
      }),
    ]))
  })

  test('narrow-double-to-real', async () => {
    const testId = 'narrow-double-to-real'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_DDL_API)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [TYPE_PATH],
        afterDeclarationPaths: [TYPE_PATH],
        type: risky,
      }),
    ]))
  })
})
