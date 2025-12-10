import { API_KIND, apiDiff, breaking, BwcScopeFunction, DiffAction, risky } from '../src'

import case2Before from './helper/resources/backward-compatibility/case2/before.json'
import case2After from './helper/resources/backward-compatibility/case2/after.json'

import case3Before from './helper/resources/backward-compatibility/case3/before.json'
import case3After from './helper/resources/backward-compatibility/case3/after.json'

import case4Before from './helper/resources/backward-compatibility/case4/before.json'
import case4After from './helper/resources/backward-compatibility/case4/after.json'

import case5Before from './helper/resources/backward-compatibility/case5/before.json'
import case5After from './helper/resources/backward-compatibility/case5/after.json'

import case6Before from './helper/resources/backward-compatibility/case6/before.json'
import case6After from './helper/resources/backward-compatibility/case6/after.json'

import { diffsMatcher } from './helper/matchers'

type PATH_ENTRY = [string, string, string]

const GET_PATH1: PATH_ENTRY = ['paths', '/path1', 'get']

function createBwcScopeFunction(data: PATH_ENTRY[]): BwcScopeFunction {
  return (path?: PropertyKey[]) => {
    if (path?.length !== 3) {
      return undefined
    }
    return data.some(entry =>
      entry.every((el, i) => path?.[i] === el),
    ) ? API_KIND.NOT_BACKWARD_COMPATIBLE : undefined
  }
}

describe('Backward compatibility tests', () => {
  it('should diff from get has risky type with NoApiBackwardCompatibility', async () => {
    const { diffs } = apiDiff(case2Before, case2After, { bwcScopeFunction: () => API_KIND.NOT_BACKWARD_COMPATIBLE })
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: risky,
      }),
    ]))
  })

  it('3', async () => {
    const { diffs } = apiDiff(
      case3Before,
      case3After,
      {
        bwcScopeFunction: createBwcScopeFunction([GET_PATH1]),
      })
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: risky,
      }),
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: breaking,
      }),
    ]))
  })

  it('4', async () => {
    const { diffs } = apiDiff(
      case4Before,
      case4After,
      {
        bwcScopeFunction: createBwcScopeFunction([GET_PATH1]),
      })
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: breaking,
      }),
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: risky,
      }),
      expect.objectContaining({
        scope: 'components',
        action: DiffAction.replace,
        type: breaking,
      }),
    ]))
  })

  it('5', async () => {
    const { diffs } = apiDiff(
      case5Before,
      case5After,
      {
        bwcScopeFunction: createBwcScopeFunction([GET_PATH1]),
      })
    expect(diffs).toEqual(diffsMatcher([
      // post
      expect.objectContaining({
        scope: 'request',
        action: DiffAction.replace,
        type: breaking,
      }),
      // post
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: breaking,
      }),
      // get
      expect.objectContaining({
        scope: 'request',
        action: DiffAction.replace,
        type: risky,
      }),
      // get
      expect.objectContaining({
        scope: 'response',
        action: DiffAction.replace,
        type: risky,
      }),
      expect.objectContaining({
        scope: 'components',
        action: DiffAction.replace,
        type: breaking,
      }),
    ]))
  })

  it('6', async () => {
    const { diffs } = apiDiff(
      case6Before,
      case6After,
      {
        bwcScopeFunction: createBwcScopeFunction([GET_PATH1]),
      })
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeValue: 'number',
        afterValue: 'string',
        scope: 'response',
        action: DiffAction.replace,
        type: risky,
      }),
      expect.objectContaining({
        beforeValue: 'string',
        afterValue: 'number',
        scope: 'response',
        action: DiffAction.replace,
        type: risky,
      }),
    ]))
  })
})
