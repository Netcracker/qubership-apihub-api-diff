import {
  allAnnotation,
  allBreaking,
  allDeprecated,
  allNonBreaking,
  allUnclassified,
  booleanClassifier,
  breaking,
  breakingIf,
  deepEqualsUniqueItemsArrayMappingResolver,
  diffDescription,
  nonBreaking,
  onlyAddBreaking,
  reverseClassifyRuleTransformer,
  risky,
  TEMPLATE_PARAM_ACTION,
  TEMPLATE_PARAM_PLACE,
  TEMPLATE_PARAM_PREPOSITION,
  TEMPLATE_PARAM_PROPERTY_NAME,
  TEMPLATE_PARAM_SCHEMA_PATH,
  TEMPLATE_PARAM_SCOPE,
  transformCompareRules,
  unclassified,
} from '../core'
import {
  enumClassifyRule,
  enumItemClassifyRuleIdRule,
  exclusiveClassifier,
  exclusiveClassifyRuleIdRule,
  maxClassifier,
  maxClassifyRuleIdRule,
  maximumClassifier,
  maximumClassifyRuleIdRule,
  minClassifier,
  minClassifyRuleIdRule,
  minimumClassifier,
  minimumClassifyRuleIdRule,
  multipleOfClassifier,
  multipleOfClassifyRuleIdRule,
  propertyClassifyRule,
  propertyClassifyRuleIdRule,
  requiredItemClassifyRule,
  requiredItemClassifyRuleIdRule,
  schemaTypeClassifyRuleIdRule,
  typeClassifier,
} from './jsonSchema.classify'
import { jsonSchemaAdapter } from './jsonSchema.adapter'
import { jsonSchemaMappingResolver } from './jsonSchema.mapping'
import { combinersCompareResolver } from './jsonSchema.resolver'
import { ClassifyRule, ClassifyRuleIdRule, CompareRules, DescriptionTemplates } from '../types'
import { JsonSchemaRulesOptions, NativeAnySchemaFactory } from './jsonSchema.types'
import { normalize, SPEC_TYPE_JSON_SCHEMA_04 } from '@netcracker/qubership-apihub-api-unifier'
import { isBoolean, isNumber, isString } from '../utils'
import { JSON_SCHEMA_CLASSIFY_RULE_IDS } from './jsonSchema.classify.ruleIds'

const simpleRule = (classify: ClassifyRule, descriptionTemplate: DescriptionTemplates) => ({
  $: classify,
  description: diffDescription(descriptionTemplate)
})

const arrayItemsRules = (value: unknown, rules: CompareRules): CompareRules => {
  return Array.isArray(value) ? {
    '/*': {
      ...rules,
      $: allBreaking,
    },
  } : {
    ...rules,
    $: allNonBreaking,
  }
}

const jsonSchemaAnyFactory: NativeAnySchemaFactory = (schema, _, opt) => {
  return normalize(schema, {
    ...opt,
    // schema is already normalized, resolveRef is disabled and originsAlreadyDefined is true in order to prevent origins override
    resolveRef: false,
    originsAlreadyDefined: true,
    validate: false,
    allowNotValidSyntheticChanges: false,
  }) as Record<PropertyKey, unknown>
}

export const jsonSchemaRules = ({
  additionalRules,
  version,
}: JsonSchemaRulesOptions): CompareRules => {
  const rules: CompareRules = {
    adapter: [
      jsonSchemaAdapter(jsonSchemaAnyFactory),
    ],
    mapping: jsonSchemaMappingResolver,
    // todo: add descriptionParamCalculator only for jsonScheme
    '/title': simpleRule(allAnnotation, resolveSchemaDescriptionTemplates('title')),
    '/description': simpleRule(allAnnotation, resolveSchemaDescriptionTemplates('description')),
    '/type': {
      ...simpleRule(typeClassifier, resolveSchemaDescriptionTemplates('type')),
      classifyRuleId: schemaTypeClassifyRuleIdRule,
    },

    '/multipleOf': { ...simpleRule(multipleOfClassifier, resolveSchemaDescriptionTemplates('multipleOf validator')), classifyRuleId: multipleOfClassifyRuleIdRule },
    '/maximum': { ...simpleRule(maximumClassifier, resolveSchemaDescriptionTemplates('maximum validator')), classifyRuleId: maximumClassifyRuleIdRule },
    '/minimum': { ...simpleRule(minimumClassifier, resolveSchemaDescriptionTemplates('minimum validator')), classifyRuleId: minimumClassifyRuleIdRule },
    ...version === SPEC_TYPE_JSON_SCHEMA_04 ? {
      '/exclusiveMaximum': { ...simpleRule(exclusiveClassifier, resolveSchemaDescriptionTemplates('exclusiveMaximum validator')), classifyRuleId: exclusiveClassifyRuleIdRule },
      '/exclusiveMinimum': { ...simpleRule(exclusiveClassifier, resolveSchemaDescriptionTemplates('exclusiveMinimum validator')), classifyRuleId: exclusiveClassifyRuleIdRule },
    } : {
      '/exclusiveMaximum': { ...simpleRule(maxClassifier, resolveSchemaDescriptionTemplates('exclusiveMaximum validator')), classifyRuleId: maxClassifyRuleIdRule },
      '/exclusiveMinimum': { ...simpleRule(minClassifier, resolveSchemaDescriptionTemplates('exclusiveMinimum validator')), classifyRuleId: minClassifyRuleIdRule },
    },
    '/maxLength': { ...simpleRule(maxClassifier, resolveSchemaDescriptionTemplates('maxLength validator')), classifyRuleId: maxClassifyRuleIdRule },
    '/minLength': { ...simpleRule(minClassifier, resolveSchemaDescriptionTemplates('minLength validator')), classifyRuleId: minClassifyRuleIdRule },
    '/pattern': { ...simpleRule([breaking, nonBreaking, breaking, nonBreaking, breaking, breaking], resolveSchemaDescriptionTemplates('pattern validator')), classifyRuleId: [JSON_SCHEMA_CLASSIFY_RULE_IDS.PATTERN_ADD, JSON_SCHEMA_CLASSIFY_RULE_IDS.PATTERN_REMOVE, JSON_SCHEMA_CLASSIFY_RULE_IDS.PATTERN_REPLACE] },
    '/maxItems': { ...simpleRule(maxClassifier, resolveSchemaDescriptionTemplates('maxItems validator')), classifyRuleId: maxClassifyRuleIdRule },
    '/minItems': { ...simpleRule(minClassifier, resolveSchemaDescriptionTemplates('minItems validator')), classifyRuleId: minClassifyRuleIdRule },
    '/uniqueItems': {
      ...simpleRule(booleanClassifier, resolveSchemaDescriptionTemplates('uniqueItems validator')),
      classifyRuleId: [
        ({ after }) => after.value === true ? JSON_SCHEMA_CLASSIFY_RULE_IDS.UNIQUE_ITEMS_AFTER_TRUE : JSON_SCHEMA_CLASSIFY_RULE_IDS.UNIQUE_ITEMS_AFTER_NOT_TRUE,
        JSON_SCHEMA_CLASSIFY_RULE_IDS.UNIQUE_ITEMS_REMOVE,
        ({ after }) => after.value === true ? JSON_SCHEMA_CLASSIFY_RULE_IDS.UNIQUE_ITEMS_AFTER_TRUE : JSON_SCHEMA_CLASSIFY_RULE_IDS.UNIQUE_ITEMS_AFTER_NOT_TRUE,
      ],
    },
    '/maxProperties': { ...simpleRule(maxClassifier, resolveSchemaDescriptionTemplates('maxProperties validator')), classifyRuleId: maxClassifyRuleIdRule },
    '/minProperties': { ...simpleRule(minClassifier, resolveSchemaDescriptionTemplates('minProperties validator')), classifyRuleId: minClassifyRuleIdRule },

    '/readOnly': {
      ...simpleRule([...booleanClassifier, ...allNonBreaking] as ClassifyRule, resolveSchemaDescriptionTemplates('readOnly status')),
      classifyRuleId: [
        ({ after }) => after.value === true ? JSON_SCHEMA_CLASSIFY_RULE_IDS.READ_ONLY_AFTER_TRUE : JSON_SCHEMA_CLASSIFY_RULE_IDS.READ_ONLY_AFTER_NOT_TRUE,
        JSON_SCHEMA_CLASSIFY_RULE_IDS.READ_ONLY_REMOVE,
        ({ after }) => after.value === true ? JSON_SCHEMA_CLASSIFY_RULE_IDS.READ_ONLY_AFTER_TRUE : JSON_SCHEMA_CLASSIFY_RULE_IDS.READ_ONLY_AFTER_NOT_TRUE,
      ],
    },
    '/writeOnly': {
      ...simpleRule([...allNonBreaking, ...allNonBreaking] as ClassifyRule, resolveSchemaDescriptionTemplates('writeOnly status')),
      classifyRuleId: [JSON_SCHEMA_CLASSIFY_RULE_IDS.WRITE_ONLY_ADD, JSON_SCHEMA_CLASSIFY_RULE_IDS.WRITE_ONLY_REMOVE, JSON_SCHEMA_CLASSIFY_RULE_IDS.WRITE_ONLY_REPLACE],
    },
    '/deprecated': simpleRule(allDeprecated, resolveSchemaDescriptionTemplates('deprecated status')),
    '/required': {
      mapping: deepEqualsUniqueItemsArrayMappingResolver,
      '/*': ({ key, value }) => {
        if (!isNumber(key) || !isString(value)) {
          return undefined
        }
        return ({
          ...simpleRule(requiredItemClassifyRule, resolveSchemaDescriptionTemplates(`required status for property '${value}'`)),
          classifyRuleId: requiredItemClassifyRuleIdRule,
          ignoreKeyDifference: true,
        })
      },
    },

    '/format': { ...simpleRule([breaking, nonBreaking, breaking, nonBreaking, breaking, breaking], resolveSchemaDescriptionTemplates('format')), classifyRuleId: [JSON_SCHEMA_CLASSIFY_RULE_IDS.FORMAT_ADD, JSON_SCHEMA_CLASSIFY_RULE_IDS.FORMAT_REMOVE, JSON_SCHEMA_CLASSIFY_RULE_IDS.FORMAT_REPLACE] },
    '/default': { ...simpleRule([nonBreaking, breaking, breaking], resolveSchemaDescriptionTemplates('default value')), classifyRuleId: [JSON_SCHEMA_CLASSIFY_RULE_IDS.DEFAULT_ADD, JSON_SCHEMA_CLASSIFY_RULE_IDS.DEFAULT_REMOVE, JSON_SCHEMA_CLASSIFY_RULE_IDS.DEFAULT_REPLACE] },

    '/enum': {
      $: [breaking, nonBreaking, breaking, nonBreaking, risky, nonBreaking],
      classifyRuleId: [JSON_SCHEMA_CLASSIFY_RULE_IDS.ENUM_ADD, JSON_SCHEMA_CLASSIFY_RULE_IDS.ENUM_REMOVE, JSON_SCHEMA_CLASSIFY_RULE_IDS.ENUM_REPLACE],
      mapping: deepEqualsUniqueItemsArrayMappingResolver,
      '/*': ({ key, value }) => {
        if (!isNumber(key)) {
          return undefined
        }
        return ({
          $: enumClassifyRule,
          classifyRuleId: enumItemClassifyRuleIdRule,
          description: diffDescription(resolveSchemaDescriptionTemplates(isString(value) || isBoolean(value) || isNumber(value) ? `possible value '${value.toString()}'` : 'some possible value')),
          ignoreKeyDifference: true,
        })
      },
    },

    '/oneOf': {
      compare: combinersCompareResolver,
      '/*': ({ key }) => {
        if (!isNumber(key)) {
          return undefined
        }
        return ({
          ...rules,
          $: [nonBreaking, breaking, breaking],
          classifyRuleId: [JSON_SCHEMA_CLASSIFY_RULE_IDS.ONE_OF_ITEM_ADD, JSON_SCHEMA_CLASSIFY_RULE_IDS.ONE_OF_ITEM_REMOVE, JSON_SCHEMA_CLASSIFY_RULE_IDS.ONE_OF_ITEM_REPLACE],
          description: diffDescription(resolveSchemaDescriptionTemplates(`oneOf[${key.toString()}]`)),
        })
      },
    },
    '/anyOf': {
      compare: combinersCompareResolver,
      '/*': ({ key }) => {
        if (!isNumber(key)) {
          return undefined
        }
        return ({
          ...rules,
          $: [nonBreaking, breaking, breaking],
          classifyRuleId: [JSON_SCHEMA_CLASSIFY_RULE_IDS.ANY_OF_ITEM_ADD, JSON_SCHEMA_CLASSIFY_RULE_IDS.ANY_OF_ITEM_REMOVE, JSON_SCHEMA_CLASSIFY_RULE_IDS.ANY_OF_ITEM_REPLACE],
          description: diffDescription(resolveSchemaDescriptionTemplates(`anyOf[${key.toString()}]`)),
        })
      },
    },
    '/allOf': {
      //TODO CHECK. This node wil be only if allOf broken!!! do we need merge it?
      compare: combinersCompareResolver,
      '/*': () => ({
        ...rules,
        $: allBreaking,
        classifyRuleId: [JSON_SCHEMA_CLASSIFY_RULE_IDS.ALL_OF_ITEM_ADD, JSON_SCHEMA_CLASSIFY_RULE_IDS.ALL_OF_ITEM_REMOVE, JSON_SCHEMA_CLASSIFY_RULE_IDS.ALL_OF_ITEM_REPLACE],
      }),
    },

    '/const': { ...simpleRule([breaking, nonBreaking, breaking], resolveSchemaDescriptionTemplates('const')), classifyRuleId: [JSON_SCHEMA_CLASSIFY_RULE_IDS.CONST_ADD, JSON_SCHEMA_CLASSIFY_RULE_IDS.CONST_REMOVE, JSON_SCHEMA_CLASSIFY_RULE_IDS.CONST_REPLACE] },
    '/not': () => ({
      // TODO check
      ...transformCompareRules(rules, reverseClassifyRuleTransformer),
      $: allBreaking,
      classifyRuleId: [JSON_SCHEMA_CLASSIFY_RULE_IDS.NOT_ADD, JSON_SCHEMA_CLASSIFY_RULE_IDS.NOT_REMOVE, JSON_SCHEMA_CLASSIFY_RULE_IDS.NOT_REPLACE],
    }),
    '/items': ({ value }) => arrayItemsRules(value, rules),
    '/additionalItems': () => ({
      ...rules,
      $: [nonBreaking, breaking, unclassified],
      classifyRuleId: [JSON_SCHEMA_CLASSIFY_RULE_IDS.ADDITIONAL_ITEMS_ADD, JSON_SCHEMA_CLASSIFY_RULE_IDS.ADDITIONAL_ITEMS_REMOVE, JSON_SCHEMA_CLASSIFY_RULE_IDS.ADDITIONAL_ITEMS_REPLACE],
    }),
    '/properties': {
      '/*': ({ key }) => {
        if (!isString(key)) {
          return undefined
        }
        return ({
          ...rules,
          $: propertyClassifyRule,
          classifyRuleId: propertyClassifyRuleIdRule,
          description: diffDescription(resolveSchemaDescriptionTemplates(`property '${key.toString()}'`)),
        })
      },
    },
    '/additionalProperties': () => ({
      ...rules,
      $: additionalPropertiesClassifier,
      classifyRuleId: additionalPropertiesClassifyRuleIdRule,
    }),
    '/patternProperties': {
      '/*': () => ({
        ...rules,
        $: [breaking, nonBreaking, unclassified],
      }),
    },
    '/propertyNames': () => ({ ...rules, $: onlyAddBreaking }),
    // TODO "/dependencies": {},
    '/definitions': {
      '/*': () => ({
        ...rules,
        $: allNonBreaking,
      }),
    },
    '/$defs': {
      '/*': () => ({
        ...rules,
        $: allNonBreaking,
      }),
    },

    //TODO NOT BY SPECIFICATION. ONLY IN 06 VERSION. NC SPECIFIC EXCLUSION
    '/examples': {
      $: allAnnotation,
      '/*': { $: allAnnotation },
    },

    // unknown tags
    '/**': {
      $: allUnclassified,
    },
    ...additionalRules,
  }
  return rules
}

const additionalPropertiesClassifyRuleIdRule: ClassifyRuleIdRule = [
  JSON_SCHEMA_CLASSIFY_RULE_IDS.ADDITIONAL_PROPERTIES_ADD,
  JSON_SCHEMA_CLASSIFY_RULE_IDS.ADDITIONAL_PROPERTIES_REMOVE,
  ({ before, after }) => {
    const beforeTruthy = !!before.value
    const afterTruthy = !!after.value
    if (beforeTruthy && afterTruthy) { return JSON_SCHEMA_CLASSIFY_RULE_IDS.ADDITIONAL_PROPERTIES_REPLACE_BEFORE_TRUTHY_AFTER_TRUTHY }
    if (beforeTruthy) { return JSON_SCHEMA_CLASSIFY_RULE_IDS.ADDITIONAL_PROPERTIES_REPLACE_BEFORE_TRUTHY_AFTER_FALSY }
    if (afterTruthy) { return JSON_SCHEMA_CLASSIFY_RULE_IDS.ADDITIONAL_PROPERTIES_REPLACE_BEFORE_FALSY_AFTER_TRUTHY }
    return JSON_SCHEMA_CLASSIFY_RULE_IDS.ADDITIONAL_PROPERTIES_REPLACE_BEFORE_FALSY_AFTER_FALSY
  },
]

const additionalPropertiesClassifier: ClassifyRule = [
  breaking,
  breaking,
  (ctx) => breakingIf(!!ctx.before.value),
  breaking,
  breaking,
  (ctx) => breakingIf(!!ctx.after.value),
]

export const resolveSchemaDescriptionTemplates = (details: string = `{{${TEMPLATE_PARAM_PROPERTY_NAME}}}`): DescriptionTemplates => ([
  `[{{${TEMPLATE_PARAM_ACTION}}}] schema {{${TEMPLATE_PARAM_PLACE}}}`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] schema in {{${TEMPLATE_PARAM_SCOPE}}}`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} schema in {{${TEMPLATE_PARAM_SCOPE}}}`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} schema {{${TEMPLATE_PARAM_PLACE}}}`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_SCHEMA_PATH}}}' in {{${TEMPLATE_PARAM_SCOPE}}}`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_SCHEMA_PATH}}}' {{${TEMPLATE_PARAM_PLACE}}}`,
])
