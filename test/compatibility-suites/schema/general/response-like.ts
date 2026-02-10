import { JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY } from '@netcracker/qubership-apihub-api-unifier'
import { TestSpecType } from '@netcracker/qubership-apihub-compatibility-suites'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { annotation, breaking, DiffAction, nonBreaking, risky } from '../../../../src'
import { diffsMatcher, expectSpecVersionChange } from '../../../helper/matchers'
import { compareFiles, compareFilesWithMerge, TEST_DEFAULTS_DECLARATION_PATHS } from '../../utils'

export function runGeneralResponseLikeSchemaTests(
  suiteType: TestSpecType,
  suiteId: string,
  commonPath: JsonPath,
): void {
  describe('General', () => {
    describe('JSON Schema Keywords', () => {
      test('Add schema title', async () => {
        const testId = 'add-schema-title'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'title']],
            type: annotation,
          }),
        ]))
      })
      test('Update schema title', async () => {
        const testId = 'update-schema-title'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'title']],
            afterDeclarationPaths: [[...commonPath, 'title']],
            type: annotation,
          }),
        ]))
      })
      test('Remove schema title', async () => {
        const testId = 'remove-schema-title'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'title']],
            type: annotation,
          }),
        ]))
      })
      test('Update schema type', async () => {
        const testId = 'update-schema-type'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'type']],
            afterDeclarationPaths: [[...commonPath, 'type']],
            type: breaking,
          }),
        ]))
      })
      test('Update schema type from specific type to any type', async () => {
        const testId = 'update-schema-type-from-specific-type-to-any-type'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeValue: 'string',
            afterValue: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
            beforeDeclarationPaths: [[...commonPath, 'type']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: breaking,
          }),
        ]))
      })
      test('Update schema type to an equivalent value', async () => {
        const testId = 'update-schema-type-to-an-equivalent-value'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual([])
      })
      test('Add enum', async () => {
        const testId = 'add-enum'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'enum']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Remove enum', async () => {
        const testId = 'remove-enum'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'enum']],
            type: risky,
          }),
        ]))
      })
      test('Add enum value', async () => {
        const testId = 'add-enum-value'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'enum', 2]],
            type: risky,
          }),
        ]))
      })
      test('Update enum value', async () => {
        const testId = 'update-enum-value'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'enum', 1]],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'enum', 1]],
            type: risky,
          }),
        ]))
      })
      test('Remove enum value', async () => {
        const testId = 'remove-enum-value'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'enum', 2]],
            type: nonBreaking,
          }),
        ]))
      })
      test('Add format for string property', async () => {
        const testId = 'add-format-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'format']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Update format for string property', async () => {
        const testId = 'update-format-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'format']],
            afterDeclarationPaths: [[...commonPath, 'format']],
            type: breaking,
          }),
        ]))
      })
      test('Remove format for string property', async () => {
        const testId = 'remove-format-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'format']],
            type: breaking,
          }),
        ]))
      })
      test('Add minLength for string property', async () => {
        const testId = 'add-min-length-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'minLength']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'minLength']],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'minLength']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Increase minLength for string property', async () => {
        const testId = 'increase-min-length-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minLength']],
            afterDeclarationPaths: [[...commonPath, 'minLength']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Decrease minLength for string property', async () => {
        const testId = 'decrease-min-length-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minLength']],
            afterDeclarationPaths: [[...commonPath, 'minLength']],
            type: breaking,
          }),
        ]))
      })
      test('Remove minLength for string property', async () => {
        const testId = 'remove-min-length-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'minLength']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'minLength']],
            type: breaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'minLength']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: breaking,
          }),
        ]))
      })
      test('Add maxLength for string property', async () => {
        const testId = 'add-max-length-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'maxLength']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Increase maxLength for string property', async () => {
        const testId = 'increase-max-length-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maxLength']],
            afterDeclarationPaths: [[...commonPath, 'maxLength']],
            type: breaking,
          }),
        ]))
      })
      test('Decrease maxLength for string property', async () => {
        const testId = 'decrease-max-length-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maxLength']],
            afterDeclarationPaths: [[...commonPath, 'maxLength']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Remove maxLength for string property', async () => {
        const testId = 'remove-max-length-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'maxLength']],
            type: breaking,
          }),
        ]))
      })
      test('Add pattern for string property', async () => {
        const testId = 'add-pattern-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'pattern']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Update pattern for string property', async () => {
        const testId = 'update-pattern-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'pattern']],
            afterDeclarationPaths: [[...commonPath, 'pattern']],
            type: breaking,
          }),
        ]))
      })
      test('Remove pattern for string property', async () => {
        const testId = 'remove-pattern-for-string-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'pattern']],
            type: breaking,
          }),
        ]))
      })
      test('Add format for number property', async () => {
        const testId = 'add-format-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'format']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Update format for number property', async () => {
        const testId = 'update-format-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'format']],
            afterDeclarationPaths: [[...commonPath, 'format']],
            type: breaking,
          }),
        ]))
      })
      test('Remove format for number property', async () => {
        const testId = 'remove-format-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'format']],
            type: breaking,
          }),
        ]))
      })
      test('Add minimum for number property', async () => {
        const testId = 'add-minimum-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'minimum']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Increase minimum for number property', async () => {
        const testId = 'increase-minimum-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minimum']],
            afterDeclarationPaths: [[...commonPath, 'minimum']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Decrease minimum for number property', async () => {
        const testId = 'decrease-minimum-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minimum']],
            afterDeclarationPaths: [[...commonPath, 'minimum']],
            type: breaking,
          }),
        ]))
      })
      test('Remove minimum for number property', async () => {
        const testId = 'remove-minimum-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'minimum']],
            type: breaking,
          }),
        ]))
      })
      test('Add maximum for number property', async () => {
        const testId = 'add-maximum-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'maximum']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Increase maximum for number property', async () => {
        const testId = 'increase-maximum-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maximum']],
            afterDeclarationPaths: [[...commonPath, 'maximum']],
            type: breaking,
          }),
        ]))
      })
      test('Decrease maximum for number property', async () => {
        const testId = 'decrease-maximum-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maximum']],
            afterDeclarationPaths: [[...commonPath, 'maximum']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Remove maximum for number property', async () => {
        const testId = 'remove-maximum-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'maximum']],
            type: breaking,
          }),
        ]))
      })
      test('Add multipleOf for number property', async () => {
        const testId = 'add-multiple-of-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'multipleOf']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Update multipleOf for number property', async () => {
        const testId = 'update-multiple-of-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'multipleOf']],
            afterDeclarationPaths: [[...commonPath, 'multipleOf']],
            type: breaking,
          }),
        ]))
      })
      test('Remove multipleOf for number property', async () => {
        const testId = 'remove-multiple-of-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'multipleOf']],
            type: breaking,
          }),
        ]))
      })
      test('Add minItems for array property', async () => {
        const testId = 'add-min-items-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'minItems']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Increase minItems for array property', async () => {
        const testId = 'increase-min-items-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minItems']],
            afterDeclarationPaths: [[...commonPath, 'minItems']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Decrease minItems for array property', async () => {
        const testId = 'decrease-min-items-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minItems']],
            afterDeclarationPaths: [[...commonPath, 'minItems']],
            type: breaking,
          }),
        ]))
      })
      test('Remove minItems for array property', async () => {
        const testId = 'remove-min-items-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minItems']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: breaking,
          }),
        ]))
      })
      test('Add maxItems for array property', async () => {
        const testId = 'add-max-items-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'maxItems']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Increase maxItems for array property', async () => {
        const testId = 'increase-max-items-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maxItems']],
            afterDeclarationPaths: [[...commonPath, 'maxItems']],
            type: breaking,
          }),
        ]))
      })
      test('Decrease maxItems for array property', async () => {
        const testId = 'decrease-max-items-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maxItems']],
            afterDeclarationPaths: [[...commonPath, 'maxItems']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Remove maxItems for array property', async () => {
        const testId = 'remove-max-items-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'maxItems']],
            type: breaking,
          }),
        ]))
      })
      test('Prohibit non-unique items for array property', async () => {
        const testId = 'prohibit-non-unique-items-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'uniqueItems']],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'uniqueItems']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'uniqueItems']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Allow non-unique items for array property', async () => {
        const testId = 'allow-non-unique-items-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'uniqueItems']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: breaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'uniqueItems']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'uniqueItems']],
            type: breaking,
          }),
        ]))
      })
      test('Add new property (compliance)', async () => {
        const testId = 'add-new-property-compliance'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'properties', 'prop2']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Remove property (compliance)', async () => {
        const testId = 'remove-property-compliance'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'prop2']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Add required property', async () => {
        const testId = 'add-required-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'required', 0]],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'required', 1]],
            type: nonBreaking,
          }),
        ]))
      })
      test('Add required property with default', async () => {
        const testId = 'add-required-property-with-default'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'required', 0]],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'required', 1]],
            type: nonBreaking,
          }),
        ]))
      })
      test('Remove required property', async () => {
        const testId = 'remove-required-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'required', 0]],
            type: breaking,
          }),
        ]))
      })
      test('Update required property', async () => {
        const testId = 'update-required-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'required', 0]],
            type: breaking,
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'required', 0]],
            type: nonBreaking,
          }),
        ]))
      })
      test('Mark object property as readOnly', async () => {
        const testId = 'mark-object-property-as-read-only'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'readOnly']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'readOnly']],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'readOnly']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Mark object property as not readOnly', async () => {
        const testId = 'mark-object-property-as-not-read-only'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'readOnly']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'readOnly']],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'readOnly']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: nonBreaking,
          }),
        ]))
      })
      test('Mark object property as writeOnly', async () => {
        const testId = 'mark-object-property-as-write-only'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'writeOnly']],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'writeOnly']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'writeOnly']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Mark object property as not writeOnly', async () => {
        const testId = 'mark-object-property-as-not-write-only'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'writeOnly']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'writeOnly']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'writeOnly']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Add minProperties for object property', async () => {
        const testId = 'add-min-properties-for-object-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'minProperties']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Increase minProperties for object property', async () => {
        const testId = 'increase-min-properties-for-object-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minProperties']],
            afterDeclarationPaths: [[...commonPath, 'minProperties']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Decrease minProperties for object property', async () => {
        const testId = 'decrease-min-properties-for-object-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minProperties']],
            afterDeclarationPaths: [[...commonPath, 'minProperties']],
            type: breaking,
          }),
        ]))
      })
      test('Remove minProperties for object property', async () => {
        const testId = 'remove-min-properties-for-object-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'minProperties']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: breaking,
          }),
        ]))
      })
      test('Add maxProperties for object property', async () => {
        const testId = 'add-max-properties-for-object-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'maxProperties']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Increase maxProperties for object property', async () => {
        const testId = 'increase-max-properties-for-object-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maxProperties']],
            afterDeclarationPaths: [[...commonPath, 'maxProperties']],
            type: breaking,
          }),
        ]))
      })
      test('Decrease maxProperties for object property', async () => {
        const testId = 'decrease-max-properties-for-object-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'maxProperties']],
            afterDeclarationPaths: [[...commonPath, 'maxProperties']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Remove maxProperties for object property', async () => {
        const testId = 'remove-max-properties-for-object-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'maxProperties']],
            type: breaking,
          }),
        ]))
      })
      test('Update definition of free-form object', async () => {
        const testId = 'update-definition-of-free-form-object'
        const result = await compareFilesWithMerge(suiteId, testId, suiteType)
        expect(result.merged).not.toHaveProperty([...commonPath, 'properties', 'option1', 'additionalProperties'])
        expect(result.merged).not.toHaveProperty([...commonPath, 'properties', 'option2', 'additionalProperties'])
        expect(result.merged).not.toHaveProperty([...commonPath, 'additionalProperties'])
        expect(result.diffs).toEqual([])
      })
      test('Add non-boolean additionalProperties', async () => {
        const testId = 'add-non-boolean-additional-properties'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeValue: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
            afterValue: 'string',
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'additionalProperties', 'type']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Update type of additionalProperties', async () => {
        const testId = 'update-type-of-additional-properties'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'additionalProperties', 'type']],
            afterDeclarationPaths: [[...commonPath, 'additionalProperties', 'type']],
            type: breaking,
          }),
        ]))
      })
      test('Remove additionalProperties', async () => {
        const testId = 'remove-additional-properties'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeValue: 'string',
            afterValue: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
            beforeDeclarationPaths: [[...commonPath, 'additionalProperties', 'type']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: breaking,
          }),
        ]))
      })
      test('Add oneOf', async () => {
        const testId = 'add-one-of'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'oneOf', 1]],
            type: breaking,
          }),
        ]))
      })
      test('Add oneOf option', async () => {
        const testId = 'add-one-of-option'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'oneOf', 2]],
            type: breaking,
          }),
        ]))
      })
      test('Remove oneOf option', async () => {
        const testId = 'remove-one-of-option'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'oneOf', 2]],
            type: nonBreaking,
          }),
        ]))
      })
      test('Remove oneOf', async () => {
        const testId = 'remove-one-of'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'oneOf', 1]],
            type: nonBreaking,
          }),
        ]))
      })
      test('Add anyOf', async () => {
        const testId = 'add-any-of'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'anyOf', 1]],
            type: breaking,
          }),
        ]))
      })
      test('Add anyOf option', async () => {
        const testId = 'add-any-of-option'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'anyOf', 2]],
            type: breaking,
          }),
        ]))
      })
      test('Remove anyOf option', async () => {
        const testId = 'remove-any-of-option'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'anyOf', 2]],
            type: nonBreaking,
          }),
        ]))
      })
      test('Remove anyOf', async () => {
        const testId = 'remove-any-of'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'anyOf', 1]],
            type: nonBreaking,
          }),
        ]))
      })
      test('Add allOf', async () => {
        const testId = 'add-all-of'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'allOf', 1, 'properties', 'prop2']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Add allOf option', async () => {
        const testId = 'add-all-of-option'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'allOf', 2, 'properties', 'prop3']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Remove allOf option', async () => {
        const testId = 'remove-all-of-option'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'allOf', 2, 'properties', 'prop3']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Remove allOf', async () => {
        const testId = 'remove-all-of'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'allOf', 1, 'properties', 'prop2']],
            type: nonBreaking,
          }),
        ]))
      })
      test.skip('Update schema type from any type to specific type', async () => {
        const testId = 'update-schema-type-from-any-type-to-specific-type'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [TEST_DEFAULTS_DECLARATION_PATHS],
            afterDeclarationPaths: [[...commonPath, 'type']],
            type: nonBreaking,
          }),
        ]))
      })
      test.skip('Update schema type from specific type to nothing type', async () => {
        const testId = 'update-schema-type-from-specific-type-to-nothing'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'type']],
            afterDeclarationPaths: [[...commonPath, 'allOf']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Update schema type from nothing type to specific type', async () => {
        const testId = 'update-schema-type-from-nothing-to-specific-type'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'allOf']],
            afterDeclarationPaths: [[...commonPath, 'type']],
            type: nonBreaking,
          }),
        ]))
      })

      // --- General default value tests ---
      test('Add minItems with default value for array property', async () => {
        const testId = 'add-minItems-with-default-value-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual([])
      })
      test('Remove minItems with default value for array property', async () => {
        const testId = 'remove-minItems-with-default-value-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual([])
      })
      test('Add uniqueItems with default value for array property', async () => {
        const testId = 'add-uniqueItems-with-default-value-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual([])
      })
      test('Remove uniqueItems with default value for array property', async () => {
        const testId = 'remove-uniqueItems-with-default-value-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual([])
      })
      test('Add minProperties with default value for object property', async () => {
        const testId = 'add-minProperties-with-default-value-for-object-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual([])
      })
      test('Remove minProperties with default value for object property', async () => {
        const testId = 'remove-minProperties-with-default-value-for-object-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual([])
      })
    })

    describe('Union Types', () => {
      test.caseForSpecVersionPairs(
        suiteType,
        'add-union-type',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.add,
              afterDeclarationPaths: [[...commonPath, 'type', 1]],
              type: breaking,
            }),
          ]))
        },
      )
      test.caseForSpecVersionPairs(
        suiteType,
        'add-null-to-union-type',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.add,
              afterDeclarationPaths: [[...commonPath, 'type', 2]],
              type: breaking,
            }),
          ]))
        },
      )
      test.caseForSpecVersionPairs(
        suiteType,
        'remove-union-type',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.remove,
              beforeDeclarationPaths: [[...commonPath, 'type', 1]],
              type: nonBreaking,
            }),
          ]))
        },
      )
      test.caseForSpecVersionPairs(
        suiteType,
        'remove-null-from-union-type',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.remove,
              beforeDeclarationPaths: [[...commonPath, 'type', 2]],
              type: nonBreaking,
            }),
          ]))
        },
      )
      test.caseForSpecVersionPairs(
        suiteType,
        'reorder-types-in-union-type',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
          ]))
        },
      )
      test.caseForSpecVersionPairs(
        suiteType,
        'union-type-equivalent-to-any-of',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
          ]))
        },
      )
    })
  })
}
