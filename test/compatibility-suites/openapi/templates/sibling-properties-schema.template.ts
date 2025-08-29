import { compareFiles } from '../../utils'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { annotation, breaking, DiffAction, nonBreaking, risky } from '../../../../src'
import { diffsMatcher } from '../../../helper/matchers'

const COMPONENTS_SCHEMAS = ['components', 'schemas']

export function runResponseSiblingPropertiesSchema(suiteId: string, commonPath: JsonPath): void {
  runTests(suiteId, commonPath, true)
}

export function runSiblingPropertiesSchema(suiteId: string, commonPath: JsonPath): void {
  runTests(suiteId, commonPath, false)
}

function runTests(suiteId: string, commonPath: JsonPath, isResponse: boolean): void {
  test('Add sibling description for ref', async () => {
    const testId = 'add-sibling-description-for-ref'
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [[...commonPath, 'description']],
        beforeDeclarationPaths: [[...COMPONENTS_SCHEMAS, 'Pet', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Change sibling enum for ref', async () => {
    const testId = 'change-sibling-enum-for-ref'
    const result = await compareFiles(suiteId, testId)
    expect(result.length).toEqual(0)
  })

  test('Change referenced enum when sibling exists for ref', async () => {
    const testId = 'change-referenced-enum-when-sibling-exists-for-ref'
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [
          [...COMPONENTS_SCHEMAS, 'Color', 'enum', 1],
          [...commonPath, 'enum', 1],
        ],
        type: isResponse ? risky : nonBreaking,
      }),
    ]))
  })

  test('Remove sibling maxLength for ref', async () => {
    const testId = 'remove-sibling-maxLength-for-ref'
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...commonPath, 'maxLength']],
        afterDeclarationPaths: [[...COMPONENTS_SCHEMAS, 'Color', 'maxLength']],
        type: isResponse ? breaking : nonBreaking,
      }),
    ]))
  })
}
