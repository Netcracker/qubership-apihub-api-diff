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

export const maxLengthClassifyRuleIdRule: ClassifyRuleIdRule = [
  JSON_SCHEMA_CLASSIFY_RULE_IDS.MAX_LENGTH_CONSTRAINT_TIGHTENED,
  JSON_SCHEMA_CLASSIFY_RULE_IDS.MAX_LENGTH_CONSTRAINT_RELAXED,
  ({ before, after }) => (isNumber(before.value) && isNumber(after.value) && before.value < after.value
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.MAX_LENGTH_CONSTRAINT_RELAXED
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.MAX_LENGTH_CONSTRAINT_TIGHTENED),
]

export const maxItemsClassifyRuleIdRule: ClassifyRuleIdRule = [
  JSON_SCHEMA_CLASSIFY_RULE_IDS.MAX_ITEMS_CONSTRAINT_TIGHTENED,
  JSON_SCHEMA_CLASSIFY_RULE_IDS.MAX_ITEMS_CONSTRAINT_RELAXED,
  ({ before, after }) => (isNumber(before.value) && isNumber(after.value) && before.value < after.value
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.MAX_ITEMS_CONSTRAINT_RELAXED
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.MAX_ITEMS_CONSTRAINT_TIGHTENED),
]

export const maxPropertiesClassifyRuleIdRule: ClassifyRuleIdRule = [
  JSON_SCHEMA_CLASSIFY_RULE_IDS.MAX_PROPERTIES_CONSTRAINT_TIGHTENED,
  JSON_SCHEMA_CLASSIFY_RULE_IDS.MAX_PROPERTIES_CONSTRAINT_RELAXED,
  ({ before, after }) => (isNumber(before.value) && isNumber(after.value) && before.value < after.value
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.MAX_PROPERTIES_CONSTRAINT_RELAXED
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.MAX_PROPERTIES_CONSTRAINT_TIGHTENED),
]

export const exclusiveMaximumClassifyRuleIdRule: ClassifyRuleIdRule = [
  JSON_SCHEMA_CLASSIFY_RULE_IDS.EXCLUSIVE_MAXIMUM_CONSTRAINT_TIGHTENED,
  JSON_SCHEMA_CLASSIFY_RULE_IDS.EXCLUSIVE_MAXIMUM_CONSTRAINT_RELAXED,
  ({ before, after }) => (isNumber(before.value) && isNumber(after.value) && before.value < after.value
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.EXCLUSIVE_MAXIMUM_CONSTRAINT_RELAXED
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.EXCLUSIVE_MAXIMUM_CONSTRAINT_TIGHTENED),
]

export const maxClassifier: ClassifyRule = [
  breaking,
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value > after.value),
]

export const minClassifyRuleIdRule: ClassifyRuleIdRule = [
  JSON_SCHEMA_CLASSIFY_RULE_IDS.MIN_ADD,
  JSON_SCHEMA_CLASSIFY_RULE_IDS.MIN_REMOVE,
  ({ before, after }) => (isNumber(before.value) && isNumber(after.value) && before.value >= after.value
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.MIN_REPLACE_CONSTRAINT_RELAXED
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.MIN_REPLACE_CONSTRAINT_TIGHTENED),
]

export const minClassifier: ClassifyRule = [
  breaking,
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value < after.value),
]

export const minimumClassifyRuleIdRule: ClassifyRuleIdRule = [
  ({ before, after }) => {
    const beforeExclusiveMinimum = getKeyValue(before.parent, 'exclusiveMinimum')
    return (isNumber(beforeExclusiveMinimum) && isNumber(after.value) && beforeExclusiveMinimum >= after.value)
      ? JSON_SCHEMA_CLASSIFY_RULE_IDS.MINIMUM_ADD_BEFORE_EXCLUSIVE_MIN_COVERS
      : JSON_SCHEMA_CLASSIFY_RULE_IDS.MINIMUM_ADD_BEFORE_EXCLUSIVE_MIN_NOT_COVERS
  },
  JSON_SCHEMA_CLASSIFY_RULE_IDS.MINIMUM_REMOVE,
  ({ before, after }) => (isNumber(before.value) && isNumber(after.value) && before.value >= after.value
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.MINIMUM_REPLACE_CONSTRAINT_RELAXED
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.MINIMUM_REPLACE_CONSTRAINT_TIGHTENED),
]

export const minimumClassifier: ClassifyRule = [
  ({ before, after }) => {
    const beforeExclusiveMinimum = getKeyValue(before.parent, 'exclusiveMinimum')
    return breakingIf(!isNumber(beforeExclusiveMinimum) || !isNumber(after.value) || beforeExclusiveMinimum < after.value)
  },
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value < after.value),
]

export const maximumClassifyRuleIdRule: ClassifyRuleIdRule = [
  ({ before, after }) => {
    const beforeExclusiveMaximum = getKeyValue(before.parent, 'exclusiveMaximum')
    return (isNumber(beforeExclusiveMaximum) && isNumber(after.value) && beforeExclusiveMaximum <= after.value)
      ? JSON_SCHEMA_CLASSIFY_RULE_IDS.MAXIMUM_CONSTRAINT_RELAXED
      : JSON_SCHEMA_CLASSIFY_RULE_IDS.MAXIMUM_CONSTRAINT_TIGHTENED
  },
  JSON_SCHEMA_CLASSIFY_RULE_IDS.MAXIMUM_CONSTRAINT_RELAXED,
  ({ before, after }) => (isNumber(before.value) && isNumber(after.value) && before.value < after.value
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.MAXIMUM_CONSTRAINT_RELAXED
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.MAXIMUM_CONSTRAINT_TIGHTENED),
]

export const maximumClassifier: ClassifyRule = [
  ({ before, after }) => {
    const beforeExclusiveMaximum = getKeyValue(before.parent, 'exclusiveMaximum')
    return breakingIf(!isNumber(beforeExclusiveMaximum) || !isNumber(after.value) || beforeExclusiveMaximum > after.value)
  },
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value > after.value),
]

export const exclusiveClassifyRuleIdRule: ClassifyRuleIdRule = [
  ({ after }) => (after.value === true
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.EXCLUSIVE_ADD_AFTER_TRUE
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.EXCLUSIVE_ADD_AFTER_NOT_TRUE),
  ({ before }) => (before.value === true
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.EXCLUSIVE_REMOVE_BEFORE_TRUE
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.EXCLUSIVE_REMOVE_BEFORE_NOT_TRUE),
  ({ after }) => (after.value === true
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.EXCLUSIVE_REPLACE_AFTER_TRUE
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.EXCLUSIVE_REPLACE_AFTER_NOT_TRUE),
]

export const exclusiveClassifier: ClassifyRule = [
  ({ after }) => (after.value === true ? breaking : unclassified),
  ({ before }) => (before.value === true ? nonBreaking : unclassified),
  breakingIfAfterTrue,
]

export const multipleOfClassifyRuleIdRule: ClassifyRuleIdRule = [
  JSON_SCHEMA_CLASSIFY_RULE_IDS.MULTIPLE_OF_ADD,
  JSON_SCHEMA_CLASSIFY_RULE_IDS.MULTIPLE_OF_REMOVE,
  ({ before, after }) => (isNumber(before.value) && isNumber(after.value) && (before.value as number) % (after.value as number) === 0
    ? JSON_SCHEMA_CLASSIFY_RULE_IDS.MULTIPLE_OF_REPLACE_NEW_IS_DIVISOR_OF_OLD
    : JSON_SCHEMA_CLASSIFY_RULE_IDS.MULTIPLE_OF_REPLACE_NEW_IS_NOT_DIVISOR_OF_OLD),
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
