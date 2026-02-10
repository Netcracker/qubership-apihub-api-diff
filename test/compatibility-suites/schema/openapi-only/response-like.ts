import { TestSpecType } from '@netcracker/qubership-apihub-compatibility-suites'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { annotation, breaking, DiffAction, nonBreaking, risky } from '../../../../src'
import { diffsMatcher, expectSpecVersionChange } from '../../../helper/matchers'
import { compareFiles, TEST_DEFAULTS_DECLARATION_PATHS } from '../../utils'

export function runOpenApiOnlyResponseLikeSchemaTests(
  suiteType: TestSpecType,
  suiteId: string,
  commonPath: JsonPath,
): void {
  describe('OpenAPI-Only', () => {
    describe('OpenAPI Vocabulary', () => {
      // nullable tests use caseForSpecVersionPairs with RESPONSE-LIKE expectations:
      // mark-schema-value-as-nullable: nullable option1 -> breaking, option2 -> breaking
      // mark-schema-value-as-non-nullable: option1 -> nonBreaking, option2 -> nonBreaking

      test.caseForSpecVersionPairs(
        suiteType,
        'mark-schema-value-as-nullable',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.replace,
              beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
              afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'nullable']],
              type: breaking,
            }),
            expect.objectContaining({
              action: DiffAction.replace,
              beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'nullable']],
              afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'nullable']],
              type: breaking,
            }),
          ]))
        },
      )

      test.caseForSpecVersionPairs(
        suiteType,
        'mark-schema-value-as-non-nullable',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.replace,
              beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'nullable']],
              afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
              type: nonBreaking,
            }),
            expect.objectContaining({
              action: DiffAction.replace,
              beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'nullable']],
              afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'nullable']],
              type: nonBreaking,
            }),
          ]))
        },
      )

      // discriminator tests - all test.skip
      test.skip('Add discriminator for oneOf', async () => {
        const testId = 'add-discriminator-for-one-of'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'discriminator']],
            type: nonBreaking,
          }),
        ]))
      })
      test.skip('Remove discriminator for oneOf', async () => {
        const testId = 'remove-discriminator-for-one-of'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'discriminator']],
            type: nonBreaking,
          }),
        ]))
      })
      test.skip('Update discriminator for oneOf', async () => {
        const testId = 'update-discriminator-for-one-of'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'discriminator', 'propertyName']],
            afterDeclarationPaths: [[...commonPath, 'discriminator', 'propertyName']],
            type: nonBreaking,
          }),
        ]))
      })
      test.skip('Add discriminator for anyOf', async () => {
        const testId = 'add-discriminator-for-any-of'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'discriminator']],
            type: nonBreaking,
          }),
        ]))
      })
      test.skip('Remove discriminator for anyOf', async () => {
        const testId = 'remove-discriminator-for-any-of'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'discriminator']],
            type: nonBreaking,
          }),
        ]))
      })
      test.skip('Update discriminator for anyOf', async () => {
        const testId = 'update-discriminator-for-any-of'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'discriminator', 'propertyName']],
            afterDeclarationPaths: [[...commonPath, 'discriminator', 'propertyName']],
            type: nonBreaking,
          }),
        ]))
      })

      // xml tests - all test.skip
      test.skip('Add xml name replacement for schema', async () => {
        const testId = 'add-xml-name-replacement-for-schema'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'xml']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Update xml name replacement for schema', async () => {
        const testId = 'update-xml-name-replacement-for-schema'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'xml', 'name']],
            afterDeclarationPaths: [[...commonPath, 'xml', 'name']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Remove xml name replacement for schema', async () => {
        const testId = 'remove-xml-name-replacement-for-schema'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'xml']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Add xml name replacement for property', async () => {
        const testId = 'add-xml-name-replacement-for-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'properties', 'id', 'xml']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Update xml name replacement for property', async () => {
        const testId = 'update-xml-name-replacement-for-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'id', 'xml', 'name']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'id', 'xml', 'name']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Remove xml name replacement for property', async () => {
        const testId = 'remove-xml-name-replacement-for-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'id', 'xml']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Mark property as xml attribute', async () => {
        const testId = 'mark-property-as-xml-attribute'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'xml', 'attribute']],
            type: breaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'xml', 'attribute']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'xml', 'attribute']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Mark property as xml element', async () => {
        const testId = 'mark-property-as-xml-element'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'xml', 'attribute']],
            type: breaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'xml', 'attribute']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'xml', 'attribute']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Add xml prefix and namespace for schema', async () => {
        const testId = 'add-xml-prefix-and-namespace-for-schema'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'xml']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Update xml prefix for schema', async () => {
        const testId = 'update-xml-prefix-for-schema'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'xml', 'prefix']],
            afterDeclarationPaths: [[...commonPath, 'xml', 'prefix']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Remove xml prefix and namespace for schema', async () => {
        const testId = 'remove-xml-prefix-and-namespace-for-schema'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'xml']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Add xml:wrapped for array property', async () => {
        const testId = 'add-xml-wrapped-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'xml', 'wrapped']],
            type: breaking,
          }),
        ]))
      })
      test.skip('Remove xml:wrapped for array property', async () => {
        const testId = 'remove-xml-wrapped-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...commonPath, 'xml', 'wrapped']],
            type: breaking,
          }),
        ]))
      })

      // nullable cross-version (OpenAPI-only)
      test.caseForSpecVersionPairs(
        suiteType,
        'nullable-equivalent-to-null',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
          ]))
        },
      )

      // OpenAPI-only default value tests
      test('Add attribute with default value for xml', async () => {
        const testId = 'add-attribute-with-default-value-for-xml'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual([])
      })
      test('Remove attribute with default value for xml', async () => {
        const testId = 'remove-attribute-with-default-value-for-xml'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual([])
      })
      test('Add xml:wrapped with default value for array property', async () => {
        const testId = 'add-xml-wrapped-with-default-value-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual([])
      })
      test('Remove xml:wrapped with default value for array property', async () => {
        const testId = 'remove-xml-wrapped-with-default-value-for-array-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual([])
      })
    })

    describe('OpenAPI 3.0 Exclusive Bounds', () => {
      test('Mark minimum value as exclusive for number property', async () => {
        const testId = 'mark-minimum-value-as-exclusive-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'exclusiveMinimum']],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMinimum']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMinimum']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Mark minimum value as inclusive for number property', async () => {
        const testId = 'mark-minimum-value-as-inclusive-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'exclusiveMinimum']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: breaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMinimum']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMinimum']],
            type: breaking,
          }),
        ]))
      })
      test('Mark maximum value as exclusive for number property', async () => {
        const testId = 'mark-maximum-value-as-exclusive-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            afterDeclarationPaths: [[...commonPath, 'properties', 'option1', 'exclusiveMaximum']],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMaximum']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMaximum']],
            type: nonBreaking,
          }),
        ]))
      })
      test('Mark maximum value as inclusive for number property', async () => {
        const testId = 'mark-maximum-value-as-inclusive-for-number-property'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option1', 'exclusiveMaximum']],
            afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
            type: breaking,
          }),
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMaximum']],
            afterDeclarationPaths: [[...commonPath, 'properties', 'option2', 'exclusiveMaximum']],
            type: breaking,
          }),
        ]))
      })
      test('Update specific type to number with exclusive maximum and exclusive minimum', async () => {
        const testId = 'update-specific-type-to-number-with-exclusive-value'
        const result = await compareFiles(suiteId, testId, suiteType)
        expect(result).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.replace,
            beforeDeclarationPaths: [[...commonPath, 'type']],
            afterDeclarationPaths: [[...commonPath, 'type']],
            type: breaking,
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'exclusiveMaximum']],
            type: nonBreaking,
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...commonPath, 'exclusiveMinimum']],
            type: nonBreaking,
          }),
        ]))
      })
    })

    describe('Reference Sibling Properties', () => {
      const COMPONENTS_SCHEMAS = ['components', 'schemas']

      test.caseForSpecVersionPairs(
        suiteType,
        'add-sibling-description-for-ref',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.replace,
              afterDeclarationPaths: [[...commonPath, 'description']],
              beforeDeclarationPaths: [[...COMPONENTS_SCHEMAS, 'Pet', 'description']],
              type: annotation,
            }),
          ]))
        },
      )
      test.caseForSpecVersionPairs(
        suiteType,
        'change-sibling-enum-for-ref',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
          ]))
        },
      )
      test.caseForSpecVersionPairs(
        suiteType,
        'change-referenced-enum-when-sibling-exists-for-ref',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.add,
              afterDeclarationPaths: [[...COMPONENTS_SCHEMAS, 'Color', 'enum', 1], [...commonPath, 'enum', 1]],
              type: risky,
            }),
          ]))
        },
      )
      test.caseForSpecVersionPairs(
        suiteType,
        'remove-sibling-maxLength-for-ref',
        suiteId,
        async ({ beforeVersion, afterVersion, diffs }) => {
          expect(diffs).toEqual(diffsMatcher([
            expectSpecVersionChange(suiteType, beforeVersion, afterVersion),
            expect.objectContaining({
              action: DiffAction.replace,
              beforeDeclarationPaths: [[...commonPath, 'maxLength']],
              afterDeclarationPaths: [[...COMPONENTS_SCHEMAS, 'Color', 'maxLength']],
              type: breaking,
            }),
          ]))
        },
      )
    })
  })
}
