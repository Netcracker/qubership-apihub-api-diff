import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { compareFiles } from '../../utils'
import { diffsMatcher } from '../../../helper/matchers'
import { annotation, DiffAction } from '../../../../src'

const enum OverridenFields {
  DESCRIPTION = 'description',
  SUMMARY = 'summary'
}

export function runRefObjectDescriptionTests(suiteId: string, commonPath: JsonPath, componentPath: JsonPath): void {
  runReferenceObjectTests(suiteId, commonPath, componentPath, OverridenFields.DESCRIPTION)
}

export function runRefObjectSummaryTests(suiteId: string, commonPath: JsonPath, componentPath: JsonPath): void {
  runReferenceObjectTests(suiteId, commonPath, componentPath, OverridenFields.SUMMARY)
}

function runReferenceObjectTests(suiteId: string, commonPath: JsonPath, componentPath: JsonPath, overridenField: OverridenFields): void {
  test(`Add overriden ${overridenField}`, async () => {
    const testId = `add-overriden-${overridenField}`
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [commonPath],
        beforeDeclarationPaths: [componentPath],
        type: annotation,
      }),
    ]))
  })

  test(`Remove overriden ${overridenField}`, async () => {
    const testId = `remove-overriden-${overridenField}`
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [componentPath],
        beforeDeclarationPaths: [commonPath],
        type: annotation,
      }),
    ]))
  })

  test(`Change overriden ${overridenField}`, async () => {
    const testId = `change-overriden-${overridenField}`
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [commonPath],
        beforeDeclarationPaths: [commonPath],
        type: annotation,
      }),
    ]))
  })

  test(`Change referenced ${overridenField} when overridden exists`, async () => {
    const testId = `change-referenced-${overridenField}-when-overridden-exists`
    const result = await compareFiles(suiteId, testId)
    expect(result.length).toEqual(0)
  })
}
