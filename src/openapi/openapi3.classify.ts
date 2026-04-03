import {
  annotation,
  booleanClassifier,
  breaking,
  breakingIfAfterTrue,
  nonBreaking,
  PARENT_JUMP,
  reverseClassifyRule,
  strictResolveValueFromContext,
  transformClassifyRule,
  unclassified,
} from '../core'
import { getKeyValue, isExist, isNotEmptyArray } from '../utils'
import { emptySecurity, includeSecurity } from './openapi3.utils'
import type { ClassifyRule, CompareContext, ClassifyRuleIdRule } from '../types'
import { DiffType } from '../types'
import { createPathUnifier } from './openapi3.mapping'
import { OpenAPIV3 } from 'openapi-types'
import { REST_CLASSIFY_RULE_IDS } from './openapi3.classify.ruleIds'

export const paramClassifyRuleIdRule: ClassifyRuleIdRule = [
  ({ after }) => {
    if (isIgnoredHeaderParam(after.value)) {
      return REST_CLASSIFY_RULE_IDS.PARAM_AFTER_IGNORED_HEADER
    }
    return getKeyValue(after.value, 'required') && !isExist(getKeyValue(after.value, 'schema', 'default'))
      ? REST_CLASSIFY_RULE_IDS.PARAM_AFTER_REQUIRED_NO_DEFAULT
      : REST_CLASSIFY_RULE_IDS.PARAM_AFTER_OPTIONAL_OR_HAS_DEFAULT
  },
  ({ before }) => (isIgnoredHeaderParam(before.value)
    ? REST_CLASSIFY_RULE_IDS.PARAM_BEFORE_IGNORED_HEADER
    : REST_CLASSIFY_RULE_IDS.PARAM_BEFORE_NOT_IGNORED_HEADER),
  REST_CLASSIFY_RULE_IDS.PARAM_REPLACE,
]

export const paramClassifyRule: ClassifyRule = [
  ({ after }) => {
    if (isIgnoredHeaderParam(after.value)) {
      return unclassified
    }

    return getKeyValue(after.value, 'required') && !isExist(getKeyValue(after.value, 'schema', 'default')) ? breaking : nonBreaking
  },
  ({ before }) => {
    return isIgnoredHeaderParam(before.value) ? unclassified : breaking
  },
  unclassified,
]

const NON_BREAKING_HEADERS = ['Accept', 'Content-Type', 'Authorization', 'authorization']

const isIgnoredHeaderParam = (param: any): boolean => {
  return param.in === 'header' && NON_BREAKING_HEADERS.includes(param.name)
}

export const apihubParametersRemovalClassifyRuleIdRule: ClassifyRuleIdRule = [
  REST_CLASSIFY_RULE_IDS.PARAMETERS_ARRAY_ADD,
  ({ before }) => {
    const value = before.value
    return Array.isArray(value) && (value as unknown[]).every(isIgnoredHeaderParam)
      ? REST_CLASSIFY_RULE_IDS.PARAMETERS_ARRAY_REMOVE_BEFORE_ALL_IGNORED_HEADERS
      : REST_CLASSIFY_RULE_IDS.PARAMETERS_ARRAY_REMOVE_BEFORE_HAS_NON_IGNORED
  },
  REST_CLASSIFY_RULE_IDS.PARAMETERS_ARRAY_REPLACE,
]

export const apihubParametersRemovalClassifyRule = (ctx: CompareContext): DiffType => {
  const { before: { value } } = ctx
  if (!Array.isArray(value)) {
    return breaking
  }

  return value.every(isIgnoredHeaderParam)
    ? nonBreaking
    : breaking
}

const isExplodeDefaultForStyle = (value: unknown, parent: unknown): boolean =>
  (!!value && getKeyValue(parent, 'style') === 'form') ||
  (!value && getKeyValue(parent, 'style') !== 'form')

export const parameterExplodeClassifyRuleIdRule: ClassifyRuleIdRule = [
  ({ after }) => (isExplodeDefaultForStyle(after.value, after.parent)
    ? REST_CLASSIFY_RULE_IDS.PARAMETER_EXPLODE_AFTER_DEFAULT_FOR_STYLE
    : REST_CLASSIFY_RULE_IDS.PARAMETER_EXPLODE_AFTER_NON_DEFAULT_FOR_STYLE),
  ({ before }) => (isExplodeDefaultForStyle(before.value, before.parent)
    ? REST_CLASSIFY_RULE_IDS.PARAMETER_EXPLODE_BEFORE_DEFAULT_FOR_STYLE
    : REST_CLASSIFY_RULE_IDS.PARAMETER_EXPLODE_BEFORE_NON_DEFAULT_FOR_STYLE),
  REST_CLASSIFY_RULE_IDS.PARAMETER_EXPLODE_REPLACE,
]

export const parameterExplodeClassifyRule: ClassifyRule = [
  ({ after }) => ((after.value && getKeyValue(after.parent, 'style') === 'form') || (!after.value && getKeyValue(after.parent, 'style') !== 'form') ? annotation : breaking),
  ({ before }) => ((before.value && getKeyValue(before.parent, 'style') === 'form') || (!before.value && getKeyValue(before.parent, 'style') !== 'form') ? annotation : breaking),
  breaking,
]

const isAllowReservedNonApplicable = (after: { parent: unknown }): boolean =>
  ['path', 'cookie', 'header'].includes(getKeyValue(after.parent, 'in') as string)

export const parameterAllowReservedClassifyRuleIdRule: ClassifyRuleIdRule = [
  ({ after }) => (isAllowReservedNonApplicable(after)
    ? REST_CLASSIFY_RULE_IDS.PARAMETER_ALLOW_RESERVED_AFTER_IN_NON_QUERY
    : REST_CLASSIFY_RULE_IDS.PARAMETER_ALLOW_RESERVED_AFTER_IN_QUERY),
  // The classifier uses `after` for the remove case (parameter still present; `in` is on after.parent)
  ({ after }) => (isAllowReservedNonApplicable(after)
    ? REST_CLASSIFY_RULE_IDS.PARAMETER_ALLOW_RESERVED_AFTER_IN_NON_QUERY
    : REST_CLASSIFY_RULE_IDS.PARAMETER_ALLOW_RESERVED_AFTER_IN_QUERY),
  ({ after }) => {
    if (isAllowReservedNonApplicable(after)) {
      return REST_CLASSIFY_RULE_IDS.PARAMETER_ALLOW_RESERVED_AFTER_IN_NON_QUERY
    }
    return after.value
      ? REST_CLASSIFY_RULE_IDS.PARAMETER_ALLOW_RESERVED_REPLACE_AFTER_TRUE
      : REST_CLASSIFY_RULE_IDS.PARAMETER_ALLOW_RESERVED_REPLACE_AFTER_FALSE
  },
]

export const parameterAllowReservedClassifyRule: ClassifyRule = [
  ({ after }) => (['path', 'cookie', 'header'].includes(getKeyValue(after.parent, 'in') as string) ? unclassified : nonBreaking),
  ({ after }) => (['path', 'cookie', 'header'].includes(getKeyValue(after.parent, 'in') as string) ? unclassified : breaking),
  ({ after }) => {
    if (['path', 'cookie', 'header'].includes(getKeyValue(after.parent, 'in') as string)) {
      return unclassified
    }
    return after.value ? nonBreaking : breaking
  },
]

export const parameterNameClassifyRuleIdRule: ClassifyRuleIdRule = [
  REST_CLASSIFY_RULE_IDS.PARAMETER_NAME_ADD,
  REST_CLASSIFY_RULE_IDS.PARAMETER_NAME_REMOVE,
  ({ before }) => (getKeyValue(before.parent, 'in') === 'path'
    ? REST_CLASSIFY_RULE_IDS.PARAMETER_NAME_REPLACE_BEFORE_PATH_PARAM
    : REST_CLASSIFY_RULE_IDS.PARAMETER_NAME_REPLACE_BEFORE_NON_PATH_PARAM),
]

export const parameterNameClassifyRule: ClassifyRule = [
  nonBreaking,
  breaking,
  ({ before }) => (getKeyValue(before.parent, 'in') === 'path' ? annotation : breaking),
]

export const parameterRequiredClassifyRuleIdRule: ClassifyRuleIdRule = [
  REST_CLASSIFY_RULE_IDS.PARAMETER_REQUIRED_ADD,
  REST_CLASSIFY_RULE_IDS.PARAMETER_REQUIRED_REMOVE,
  ({ after }) => {
    if (getKeyValue(after.parent, 'schema', 'default')) {
      return REST_CLASSIFY_RULE_IDS.PARAMETER_REQUIRED_REPLACE_HAS_SCHEMA_DEFAULT
    }
    return after.value
      ? REST_CLASSIFY_RULE_IDS.PARAMETER_REQUIRED_REPLACE_AFTER_TRUE_NO_DEFAULT
      : REST_CLASSIFY_RULE_IDS.PARAMETER_REQUIRED_REPLACE_AFTER_FALSE
  },
]

export const parameterRequiredClassifyRule: ClassifyRule = [
  breaking,
  nonBreaking,
  (ctx) => (getKeyValue(ctx.after.parent, 'schema', 'default') ? nonBreaking : breakingIfAfterTrue(ctx)),
]

export const apihubAllowEmptyValueParameterClassifyRuleIdRule: ClassifyRuleIdRule =
  ({ after }) => {
    if (getKeyValue(after.parent, 'in') !== 'query') {
      return REST_CLASSIFY_RULE_IDS.PARAMETER_ALLOW_EMPTY_VALUE_AFTER_NOT_QUERY
    }
    return after.value === true
      ? REST_CLASSIFY_RULE_IDS.PARAMETER_ALLOW_EMPTY_VALUE_AFTER_TRUE
      : REST_CLASSIFY_RULE_IDS.PARAMETER_ALLOW_EMPTY_VALUE_AFTER_NOT_TRUE
  }

export const apihubAllowEmptyValueParameterClassifyRule: ClassifyRule = transformClassifyRule(
  reverseClassifyRule(booleanClassifier),
  (type, { after }, action) => (
    getKeyValue(after.parent, 'in') === 'query'
      ? type
      : unclassified
  ),
)

export const paramSchemaTypeClassifyRule: ClassifyRule = [
  breaking,
  nonBreaking,
  ({ before, after }) => {
    const paramValue = strictResolveValueFromContext(before, PARENT_JUMP, PARENT_JUMP)
    const paramStyle = getKeyValue(paramValue, 'style') ?? 'form'
    if (getKeyValue(paramValue, 'in') === 'query' && paramStyle === 'form') {
      return before.value === 'object' || before.value === 'array' || after.value === 'object' ? breaking : nonBreaking
    }
    return breaking
  },
]

export const globalSecurityClassifyRule: ClassifyRule = [
  ({ after }) => (!emptySecurity(after.value) ? breaking : nonBreaking),
  nonBreaking,
  ({
    after,
    before,
  }) => (includeSecurity(after.value, before.value) || emptySecurity(after.value) ? nonBreaking : breaking),
]

export const globalSecurityItemClassifyRule: ClassifyRule = [
  ({ before }) => (isNotEmptyArray(before.parent) ? nonBreaking : breaking),
  ({ after }) => (isNotEmptyArray(after.parent) ? nonBreaking : breaking),
  ({
    after,
    before,
  }) => (includeSecurity(after.parent, before.parent) || emptySecurity(after.value) ? nonBreaking : breaking),
]

export const operationSecurityClassifyRuleIdRule: ClassifyRuleIdRule = [
  ({ before, after }) => (emptySecurity(after.value) || includeSecurity(after.value, getKeyValue(before.root, 'security'))
    ? REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_SUBSET
    : REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_NOT_SUBSET),
  ({ before, after }) => (includeSecurity(getKeyValue(after.root, 'security'), before.value)
    ? REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_SUBSET
    : REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_NOT_SUBSET),
  ({ before, after }) => (includeSecurity(after.value, before.value) || emptySecurity(after.value)
    ? REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_SUBSET
    : REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_NOT_SUBSET),
]

export const operationSecurityClassifyRule: ClassifyRule = [
  ({
    before,
    after,
  }) => (emptySecurity(after.value) || includeSecurity(after.value, getKeyValue(before.root, 'security')) ? nonBreaking : breaking),
  ({ before, after }) => (includeSecurity(getKeyValue(after.root, 'security'), before.value) ? nonBreaking : breaking),
  ({
    before,
    after,
  }) => (includeSecurity(after.value, before.value) || emptySecurity(after.value) ? nonBreaking : breaking),
]

export const operationSecurityItemClassifyRuleIdRule: ClassifyRuleIdRule = [
  ({ before }) => (isNotEmptyArray(before.parent)
    ? REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_ITEM_SUBSET
    : REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_ITEM_NOT_SUBSET),
  ({ after }) => (!isNotEmptyArray(after.parent)
    ? REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_ITEM_SUBSET
    : REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_ITEM_NOT_SUBSET),
  ({ before, after }) => (includeSecurity(after.parent, before.parent) || emptySecurity(after.value)
    ? REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_ITEM_SUBSET
    : REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_ITEM_NOT_SUBSET),
]

export const operationSecurityItemClassifyRule: ClassifyRule = [
  ({ before }) => (isNotEmptyArray(before.parent) ? nonBreaking : breaking),
  ({ after }) => (isNotEmptyArray(after.parent) ? breaking : nonBreaking),
  ({
    before,
    after,
  }) => (includeSecurity(after.parent, before.parent) || emptySecurity(after.value) ? nonBreaking : breaking),
]

export const pathChangeClassifyRule: ClassifyRule = [
  nonBreaking,
  breaking,
  ({ before, after, parentContext }) => {
    const beforePath = before.key as string
    const afterPath = after.key as string
    const beforeRootServers = (parentContext?.before.root as OpenAPIV3.Document)?.servers
    const beforePathItemServers = (before.value as OpenAPIV3.PathItemObject)?.servers

    const afterRootServers = (parentContext?.after.root as OpenAPIV3.Document)?.servers
    const afterPathItemServers = (after.value as OpenAPIV3.PathItemObject)?.servers

    const unifiedBeforePath = createPathUnifier(beforeRootServers)(beforePath, beforePathItemServers)
    const unifiedAfterPath = createPathUnifier(afterRootServers)(afterPath, afterPathItemServers)
    // If unified paths are the same, it means only parameter names changed
    return unifiedBeforePath === unifiedAfterPath ? annotation : breaking
  },
]
