import {
  breaking,
  breakingIf,
  breakingIfAfterTrue,
  nonBreaking,
  PARENT_JUMP,
  risky,
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
import type { ClassifyRule, ClassifyRuleIdRule, NodeContext } from '../types'
import { JSON_SCHEMA_CLASSIFY_RULE_IDS } from './jsonSchema.classify.ruleIds'

/**
 * Captures the classification case for JSON Schema `/type` changes
 *
 *  - add / remove  → just capture as type add / remove
 *  - replace       → depends on assignability between the before and after types:
 *      BROADENING   (after ⊇ before, e.g. integer → number)
 *      NARROWING    (after ⊆ before, e.g. number → integer)
 *      INCOMPATIBLE (neither, e.g. string → integer)
 */
export const schemaTypeClassifyRuleIdRule: ClassifyRuleIdRule = [
  JSON_SCHEMA_CLASSIFY_RULE_IDS.TYPE_ADD,
  JSON_SCHEMA_CLASSIFY_RULE_IDS.TYPE_REMOVE,
  ({ before, after }) => {
    if (isTypeAssignable(before.value, after.value, false)) {
      return JSON_SCHEMA_CLASSIFY_RULE_IDS.TYPE_REPLACE_AFTER_SUPERSET_BEFORE
    }
    if (isTypeAssignable(before.value, after.value, true)) {
      return JSON_SCHEMA_CLASSIFY_RULE_IDS.TYPE_REPLACE_AFTER_SUBSET_BEFORE
    }
    return JSON_SCHEMA_CLASSIFY_RULE_IDS.TYPE_REPLACE_INCOMPATIBLE
  },
]

export const typeClassifier: ClassifyRule = [
  breaking,//not tested
  breaking,//not tested
  ({ before, after }) => nonBreakingIf(isTypeAssignable(before.value, after.value, false)),
  breaking,//not tested
  breaking,//not tested
  ({ before, after }) => nonBreakingIf(isTypeAssignable(before.value, after.value, true)),
]

export const maxClassifier: ClassifyRule = [
  breaking,
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value > after.value),
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
]

//todo think about replace multipleOf in inverse case
export const multipleOfClassifier: ClassifyRule = [
  breaking,
  nonBreaking,
  ({ before, after }) => breakingIfNotMultiple(before.value, after.value),
  nonBreaking,
  breaking,
  breaking,
]

const requiredItemHasPropertyDefault = (after: NodeContext): boolean =>
  !isString(after.value) || isExist(strictResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, 'properties', after.value, 'default'))

export const requiredItemClassifyRuleIdRule: ClassifyRuleIdRule =
  ({ after }) => (requiredItemHasPropertyDefault(after)
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.REQUIRED_ITEM_AFTER_PROPERTY_HAS_DEFAULT
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.REQUIRED_ITEM_AFTER_PROPERTY_HAS_NO_DEFAULT)

export const requiredItemClassifyRule: ClassifyRule = [
  ({ after }) => (requiredItemHasPropertyDefault(after) ? nonBreaking : breaking),
  nonBreaking,
  ({ after }) => (requiredItemHasPropertyDefault(after) ? nonBreaking : breaking),
  nonBreaking,
  breaking,
  breaking,
]

const propertyHasDefault = (nodeCtx: NodeContext): boolean =>
  isExist(getKeyValue(nodeCtx.value, 'default'))

const propertyIsRequired = (nodeCtx: NodeContext): boolean =>
  !!getArrayValue(strictResolveValueFromContext(nodeCtx, PARENT_JUMP, PARENT_JUMP, 'required'))?.includes(nodeCtx.key)

export const propertyClassifyRuleIdRule: ClassifyRuleIdRule = [
  ({ after }) => (!propertyHasDefault(after) && propertyIsRequired(after)
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.PROPERTY_AFTER_REQUIRED_NO_DEFAULT
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.PROPERTY_AFTER_OPTIONAL_OR_HAS_DEFAULT),
  ({ before }) => (propertyIsRequired(before)
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.PROPERTY_BEFORE_REQUIRED
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.PROPERTY_BEFORE_NOT_REQUIRED),
  JSON_SCHEMA_CLASSIFY_RULE_IDS.PROPERTY,
]

//todo add logic about compliance with additionalProperties
export const propertyClassifyRule: ClassifyRule = [
  ({ after }) => (!propertyHasDefault(after) && propertyIsRequired(after) ? breaking : nonBreaking),
  breaking,
  unclassified,
  nonBreaking,
  ({ before }) => (propertyIsRequired(before) ? breaking : nonBreaking),
  unclassified,
]

export const enumItemClassifyRuleIdRule: ClassifyRuleIdRule = [
  ({ before }) => (isNotEmptyArray(before.parent)
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.ENUM_ITEM_BEFORE_ENUM_NON_EMPTY
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.ENUM_ITEM_BEFORE_ENUM_EMPTY),
  ({ after }) => (isNotEmptyArray(after.parent)
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.ENUM_ITEM_AFTER_ENUM_NON_EMPTY
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.ENUM_ITEM_AFTER_ENUM_EMPTY),
    JSON_SCHEMA_CLASSIFY_RULE_IDS.ENUM_ITEM,
]

export const enumClassifyRule: ClassifyRule = [
  ({ before }) => (isNotEmptyArray(before.parent) ? nonBreaking : breaking),
  ({ after }) => (isNotEmptyArray(after.parent) ? breaking : nonBreaking),
  breaking,
  ({ before }) => (isNotEmptyArray(before.parent) ? risky : nonBreaking),
  ({ after }) => (isNotEmptyArray(after.parent) ? nonBreaking : risky),
  nonBreaking,
]

export const nonInvertible = (rule: ClassifyRule): ClassifyRule => {
  return [...rule, ...rule] as ClassifyRule
}

export const breakingIfNotMultiple = (num1: unknown, num2: unknown) =>
  breakingIf(!isNumber(num1) || !isNumber(num2) || (num1 % num2 !== 0))
