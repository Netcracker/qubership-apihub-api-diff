import {
  breaking,
  breakingIf,
  breakingIfAfterTrue,
  nonBreaking,
  PARENT_JUMP,
  risky,
  riskyIf,
  strictResolveValueFromContext,
  unclassified,
} from '../core'
import {
  getArrayValue,
  getKeyValue,
  isExist,
  isNotEmptyArray,
  isNumber,
  isString,
  isTypeAssignable,
  nonBreakingIf,
} from '../utils'
import type { ClassifyRule } from '../types'

export const typeClassifier: ClassifyRule = [
  breaking,//not tested
  breaking,//not tested
  ({ before, after }) => nonBreakingIf(isTypeAssignable(before.value, after.value, false)),
  breaking,//not tested
  breaking,//not tested
  ({ before, after }) => isTypeAssignable(before.value, after.value, true) ? risky : breaking,
]

export const maxClassifier: ClassifyRule = [
  breaking,
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value > after.value),
  nonBreaking,
  risky,
  ({ before, after }) => riskyIf(isNumber(before.value) && isNumber(after.value) && before.value < after.value),
]

export const minClassifier: ClassifyRule = [
  breaking,
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value < after.value),
]

export const minimumClassifier: ClassifyRule = [
  ({ before, after }) => {
    const beforeExclusiveMinimum = getKeyValue(before.parent, 'exclusiveMinimum')
    return breakingIf(!isNumber(beforeExclusiveMinimum) || !isNumber(after.value) || beforeExclusiveMinimum < after.value)
  },
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value < after.value),
  ({ before, after }) => {
    const beforeExclusiveMinimum = strictResolveValueFromContext(before, PARENT_JUMP, 'exclusiveMinimum')
    return nonBreakingIf(!isNumber(beforeExclusiveMinimum) || !isNumber(after.value) || beforeExclusiveMinimum < after.value)
  },
  ({ before }) => {
    const propertyName = before.parentContext?.key
    const requiredArray = getArrayValue(strictResolveValueFromContext(before, PARENT_JUMP, PARENT_JUMP, PARENT_JUMP, 'required'))
    if (isString(propertyName) && requiredArray?.includes(propertyName)) {
      return breaking
    }
    return risky
  },
  ({ before, after }) => {
    if (!isNumber(before.value) || !isNumber(after.value) || before.value < after.value) {
      return nonBreaking
    }
    const propertyName = before.parentContext?.key
    const requiredArray = getArrayValue(strictResolveValueFromContext(before, PARENT_JUMP, PARENT_JUMP, PARENT_JUMP, 'required'))
    if (isString(propertyName) && requiredArray?.includes(propertyName)) {
      return breaking
    }
    return risky
  },
]

export const maximumClassifier: ClassifyRule = [
  ({ before, after }) => {
    const beforeExclusiveMaximum = getKeyValue(before.parent, 'exclusiveMaximum')
    return breakingIf(!isNumber(beforeExclusiveMaximum) || !isNumber(after.value) || beforeExclusiveMaximum > after.value)
  },
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value > after.value),
]

export const exclusiveClassifier: ClassifyRule = [
  ({ after }) => (after.value === true ? breaking : unclassified),
  ({ before }) => (before.value === true ? nonBreaking : unclassified),
  breakingIfAfterTrue,
  ({ after }) => (after.value === true ? nonBreaking : unclassified),
  ({ before }) => (before.value === true ? risky : unclassified),
  ({ after }) => riskyIf(!after.value),
]

//todo think about replace multipleOf in inverse case
export const multipleOfClassifier: ClassifyRule = [
  breaking,
  nonBreaking,
  ({ before, after }) => breakingIfNotMultiple(before.value, after.value),
  nonBreaking,
  breaking,
  risky,
]

export const requiredItemClassifyRule: ClassifyRule = [
  // classification is the same, but we are keeping the code structure to be able to change it if needed
  ({ after }) => (!isString(after.value) || isExist(strictResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, 'properties', after.value, 'default')) ? breaking : breaking),
  nonBreaking,
  ({ after }) => (!isString(after.value) || isExist(strictResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, 'properties', after.value, 'default')) ? nonBreaking : breaking),
  nonBreaking,
  breaking,
  breaking,
]

//todo add logic about compliance with additionalProperties
export const propertyClassifyRule: ClassifyRule = [
  ({ after }) => (
    !isExist(getKeyValue(after.value, 'default')) &&
    getArrayValue((strictResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, 'required')))?.includes(after.key) ? breaking : nonBreaking
  ),
  nonBreaking,
  unclassified,
  nonBreaking,
  ({ before }) => (getArrayValue(strictResolveValueFromContext(before, PARENT_JUMP, PARENT_JUMP, 'required'))?.includes(before.key) ? breaking : nonBreaking),
  unclassified,
]

export const enumClassifyRule: ClassifyRule = [
  ({ before }) => (isNotEmptyArray(before.parent) ? nonBreaking : breaking),
  ({ after }) => (isNotEmptyArray(after.parent) ? breaking : nonBreaking),
  breaking,
  ({ before }) => (isNotEmptyArray(before.parent) ? risky : nonBreaking),
  ({ after }) => (isNotEmptyArray(after.parent) ? nonBreaking: risky ),
  nonBreaking
]

export const nonInvertible = (rule: ClassifyRule): ClassifyRule => {
  return [...rule, ...rule] as ClassifyRule
}

export const breakingIfNotMultiple = (num1: unknown, num2: unknown) =>
  breakingIf(!isNumber(num1) || !isNumber(num2) || (num1 % num2 !== 0))
