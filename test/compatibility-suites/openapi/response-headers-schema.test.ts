import { compareFiles } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { breaking, DiffAction, nonBreaking } from '../../../src'

const SUITE_ID = 'response-headers-schema'

const RESPONSE_SCHEMA31_PATH = [
  'paths',
  '/example',
  'get',
  'responses',
  '200',
  'headers',
  'X-Header-1',
  'schema',
]

describe('Openapi31 ResponseHeaders.Schema ', () => {
  test('Add union type', async () => {
    const testId = 'add-union-type'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...RESPONSE_SCHEMA31_PATH, 'type', 1]],
        type: breaking,
      }),
    ]))
  })

  test('Add null to union type', async () => {
    const testId = 'add-null-to-union-type'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...RESPONSE_SCHEMA31_PATH, 'type', 2]],
        type: breaking,
      }),
    ]))
  })

  test('Remove union type', async () => {
    const testId = 'remove-union-type'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...RESPONSE_SCHEMA31_PATH, 'type', 1]],
        type: nonBreaking,
      }),
    ]))
  })

  test('Remove null from union type', async () => {
    const testId = 'remove-null-from-union-type'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...RESPONSE_SCHEMA31_PATH, 'type', 2]],
        type: nonBreaking,
      }),
    ]))
  })

  test('Reorder types in union type', async () => {
    const testId = 'reorder-types-in-union-type'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result.length).toEqual(0)
  })
})
