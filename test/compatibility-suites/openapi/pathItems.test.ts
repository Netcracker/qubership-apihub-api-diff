import { compareFiles } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { breaking, DiffAction, nonBreaking } from '../../../src'

const SUITE_ID = 'pathItems'

const PATH_ITEM_PATH = [
  'components',
  'pathItems',
  'UserOps',
]

describe('Openapi3.1 PathItems', () => {

  test('Add method in pathitem', async () => {
    const testId = 'add-method-in-pathitem'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...PATH_ITEM_PATH, 'post']],
        type: nonBreaking,
      }),
    ]))
  })

  test('Add unused method in pathitem', async () => {
    const testId = 'add-unused-method-in-pathitem'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual([])
  })

  test('Remove method in pathitem', async () => {
    const testId = 'remove-method-in-pathitem'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...PATH_ITEM_PATH, 'post']],
        type: breaking,
      }),
    ]))
  })

  test('Replace inline pathitem to ref', async () => {
    const testId = 'replace-inline-pathitem-to-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual([])
  })

  test('Replace ref pathitem to inline', async () => {
    const testId = 'replace-ref-pathitem-to-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual([])
  })
})
