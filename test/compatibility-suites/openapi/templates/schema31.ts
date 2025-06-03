import { compareFiles } from '../../utils'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { breaking, DiffAction, nonBreaking } from '../../../../src'
import { diffsMatcher } from '../../../helper/matchers'

export function runCommonSchema31Tests(suiteId: string, commonPath: JsonPath): void {
  test('Add second type', async () => {
    const testId = 'add-second-type'
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...commonPath, 'type', 1]],
        type: nonBreaking,
      }),
    ]))
  })

  test('Add third type', async () => {
    const testId = 'add-third-type'
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...commonPath, 'type', 2]],
        type: nonBreaking,
      }),
    ]))
  })

  test('Remove second type', async () => {
    const testId = 'remove-second-type'
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...commonPath, 'type', 1]],
        type: breaking,
      }),
    ]))
  })

  test('Remove third type', async () => {
    const testId = 'remove-third-type'
    const result = await compareFiles(suiteId, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...commonPath, 'type', 2]],
        type: breaking,
      }),
    ]))
  })

  test('Reorder types', async () => {
    const testId = 'reorder-types'
    const result = await compareFiles(suiteId, testId)
    expect(result.length).toEqual(0)
  })
}
