import { compareFiles } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { breaking, DiffAction, nonBreaking } from '../../../src'

const SUITE_ID = 'path-item'

const PATH_ITEM_PATH = [
  'components',
  'pathItems',
  'UserOps',
]

describe('Openapi3.1 PathItems', () => {

  test('Add method in path item', async () => {
    const testId = 'add-method-in-path-item'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...PATH_ITEM_PATH, 'post']],
        type: nonBreaking,
      }),
    ]))
  })

  test('Add unused method in path item', async () => {
    const testId = 'add-unused-method-in-path-item'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual([])
  })

  test('Remove method in path item', async () => {
    const testId = 'remove-method-in-path-item'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...PATH_ITEM_PATH, 'post']],
        type: breaking,
      }),
    ]))
  })

  test('Replace inline path item to ref', async () => {
    const testId = 'replace-inline-path-item-to-ref'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual([])
  })

  test('Replace ref path item to inline', async () => {
    const testId = 'replace-ref-path-item-to-inline'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual([])
  })
})
