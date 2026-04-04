import {
  allAnnotation,
  allBreaking,
  allDeprecated,
  allNonBreaking,
  allUnclassified,
  breaking,
  breakingIfAfterTrue,
  deepEqualsUniqueItemsArrayMappingResolver,
  diffDescription,
  GREP_TEMPLATE_PARAM_ENCODING_NAME,
  GREP_TEMPLATE_PARAM_EXAMPLE_NAME,
  GREP_TEMPLATE_PARAM_HEADER_NAME,
  GREP_TEMPLATE_PARAM_MEDIA_TYPE,
  GREP_TEMPLATE_PARAM_PARAMETER_NAME,
  GREP_TEMPLATE_PARAM_RESPONSE_NAME,
  nonBreaking,
  TEMPLATE_PARAM_ACTION,
  TEMPLATE_PARAM_COMPONENT_PATH,
  TEMPLATE_PARAM_EXAMPLE_PATH,
  TEMPLATE_PARAM_HEADER_PATH,
  TEMPLATE_PARAM_PARAMETER_LOCATION,
  TEMPLATE_PARAM_PARAMETER_PATH,
  TEMPLATE_PARAM_PLACE,
  TEMPLATE_PARAM_PREPOSITION,
  TEMPLATE_PARAM_PROPERTY_NAME,
  TEMPLATE_PARAM_REQUEST_PATH,
  TEMPLATE_PARAM_RESPONSE_PATH,
  TEMPLATE_PARAM_SCOPE,
  unclassified,
} from '../core'
import {
  COMPARE_MODE_OPERATION,
  CompareRules,
  DescriptionTemplates,
  IGNORE_DIFFERENCE_IN_KEYS_RULE,
  START_NEW_COMPARE_SCOPE_RULE,
} from '../types'
import { OpenApi3RulesOptions } from './openapi3.types'
import { openApiSchemaRules } from './openapi3.schema'
import {
  apihubAllowEmptyValueParameterClassifyRule,
  apihubAllowEmptyValueParameterClassifyRuleIdRule,
  apihubParametersRemovalClassifyRule,
  apihubParametersRemovalClassifyRuleIdRule,
  globalSecurityClassifyRule,
  globalSecurityClassifyRuleIdRule,
  globalSecurityItemClassifyRule,
  globalSecurityItemClassifyRuleIdRule,
  operationSecurityClassifyRule,
  operationSecurityItemClassifyRule,
  operationSecurityItemClassifyRuleIdRule,
  operationSecurityClassifyRuleIdRule,
  paramClassifyRule,
  paramClassifyRuleIdRule,
  parameterAllowReservedClassifyRule,
  parameterAllowReservedClassifyRuleIdRule,
  parameterExplodeClassifyRule,
  parameterExplodeClassifyRuleIdRule,
  parameterNameClassifyRule,
  parameterNameClassifyRuleIdRule,
  parameterRequiredClassifyRule,
  parameterRequiredClassifyRuleIdRule,
  pathChangeClassifyRule,
  pathChangeClassifyRuleIdRule,
} from './openapi3.classify'
import {
  contentMediaTypeMappingResolver,
  methodMappingResolver,
  paramMappingResolver,
  pathMappingResolver,
  singleOperationPathMappingResolver,
  syntheticDiffsResolver,
} from './openapi3.mapping'
import { isResponseSchema } from './openapi3.utils'
import { apihubCaseInsensitiveKeyMappingResolver } from './mapping'
import { nonBreakingIf } from '../utils'
import { COMPARE_SCOPE_COMPONENTS, COMPARE_SCOPE_REQUEST, COMPARE_SCOPE_RESPONSE } from './openapi3.const'
import { parameterParamsCalculator } from './openapi3.description.parameter'
import { requestParamsCalculator } from './openapi3.description.request'
import { responseParamsCalculator } from './openapi3.description.response'
import { contentParamsCalculator } from './openapi3.description.content'
import { examplesParamsCalculator } from './openapi3.description.examples'
import { headerParamsCalculator } from './openapi3.description.header'
import { encodingParamsCalculator } from './openapi3.description.encoding'
import { openApiSpecificationExtensionRulesFunction } from './openapi3.compare.rules'
import { REST_CLASSIFY_RULE_IDS } from './openapi3.classify.ruleIds'

const documentAnnotationRule: CompareRules = { $: allAnnotation }
const operationAnnotationRule: CompareRules = { $: allAnnotation }


/***
 * Keep consistent ordering for the rules:
 * - classify rule ($) for the node itself first
 * - other rules for the node itself in rule-key alphabetical order
 * - rules for children
 *   - for specific child keys (in alphabetical order)
 *   - prefix rules
 *   - local rules ('/*')
 *   - global rules ('/**')
 * The only exception is top-level structure of OpenAPI Object where specific key are in the natural order from the specification.
***/

export const openApi3Rules = (options: OpenApi3RulesOptions): CompareRules => {
  const requestSchemaRules = openApiSchemaRules(options)
  const responseSchemaRules = openApiSchemaRules({ ...options, response: true })

  const serversRules: CompareRules = {
    $: allAnnotation,
    '/*': {
      '/variables': {
        '/*': {
          '/enum': {
            mapping: deepEqualsUniqueItemsArrayMappingResolver,
            '/*': { ignoreKeyDifference: true },
          },
          ...openApiSpecificationExtensionRulesFunction(),
        },
      },
      ...openApiSpecificationExtensionRulesFunction(),
    },
    '/**': {
      $: allAnnotation,
    },
  }

  const externalDocumentationRules: CompareRules = {
    $: allAnnotation,
    ...openApiSpecificationExtensionRulesFunction(allAnnotation),
    '/*': {
      $: allAnnotation,
    },
  }

  const examplesRules: CompareRules = {
    $: allAnnotation,
    '/*': {
      $: allAnnotation,
      description: diffDescription(`[{{${TEMPLATE_PARAM_ACTION}}}] example '{{${GREP_TEMPLATE_PARAM_EXAMPLE_NAME}}}'`),
      descriptionParamCalculator: examplesParamsCalculator,
      '/description': {
        $: allAnnotation,
        description: diffDescription(resolveExamplesDescriptionTemplates()),
      },
      '/externalValue': {
        $: allAnnotation,
        description: diffDescription(resolveExamplesDescriptionTemplates()),
      },
      '/summary': {
        $: allAnnotation,
        description: diffDescription(resolveExamplesDescriptionTemplates()),
      },
      '/value': {
        $: allAnnotation,
        description: diffDescription(resolveExamplesDescriptionTemplates()),
        '/**': {
          $: allAnnotation,
          description: diffDescription(resolveExamplesDescriptionTemplates()),
        }
      },
      ...openApiSpecificationExtensionRulesFunction(allAnnotation),
    },
    '/**': { $: allAnnotation },
  }

  const parametersRules: CompareRules = {
    '/*': {
      $: paramClassifyRule,
      classifyRuleId: paramClassifyRuleIdRule,
      description: diffDescription([`[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PARAMETER_LOCATION}}} parameter '{{${GREP_TEMPLATE_PARAM_PARAMETER_NAME}}}'`]),
      descriptionParamCalculator: parameterParamsCalculator,
      [IGNORE_DIFFERENCE_IN_KEYS_RULE]: true,
      [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_REQUEST,
      '/allowEmptyValue': {
        $: apihubAllowEmptyValueParameterClassifyRule,
        classifyRuleId: apihubAllowEmptyValueParameterClassifyRuleIdRule,
        description: diffDescription(resolveParameterDescriptionTemplates('allowEmptyValue status'))
      },
      '/allowReserved': {
        $: parameterAllowReservedClassifyRule,
        classifyRuleId: parameterAllowReservedClassifyRuleIdRule,
        description: diffDescription(resolveParameterDescriptionTemplates('allowReserved status'))
      },
      '/deprecated': {
        $: allDeprecated,
        description: diffDescription(resolveParameterDescriptionTemplates('deprecated status'))
      },
      '/description': {
        $: allAnnotation,
        description: diffDescription(resolveParameterDescriptionTemplates('description'))
      },
      '/example': {
        $: allAnnotation,
        description: diffDescription(resolveParameterDescriptionTemplates('example')),
        '/**': {
          $: allAnnotation,
          description: diffDescription(resolveParameterDescriptionTemplates())
        }
      },
      '/examples': examplesRules,
      '/explode': {
        $: parameterExplodeClassifyRule,
        classifyRuleId: parameterExplodeClassifyRuleIdRule,
        description: diffDescription(resolveParameterDescriptionTemplates('explode status'))
      },
      '/in': {
        $: [nonBreaking, breaking, breaking],
        classifyRuleId: REST_CLASSIFY_RULE_IDS.PARAMETER_IN,
        description: diffDescription(`[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PARAMETER_LOCATION}}} parameter '{{${GREP_TEMPLATE_PARAM_PARAMETER_NAME}}}'`),
      },
      '/name': {
        $: parameterNameClassifyRule,
        classifyRuleId: parameterNameClassifyRuleIdRule,
        description: diffDescription(`[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PARAMETER_LOCATION}}} parameter '{{${GREP_TEMPLATE_PARAM_PARAMETER_NAME}}}'`),
      },
      '/required': {
        $: parameterRequiredClassifyRule,
        classifyRuleId: parameterRequiredClassifyRuleIdRule,
        description: diffDescription(resolveParameterDescriptionTemplates('required status'))
      },
      '/schema': () => ({
        $: allBreaking,
        classifyRuleId: REST_CLASSIFY_RULE_IDS.PARAMETER_SCHEMA,
        ...requestSchemaRules,
      }),
      '/style': {
        $: allBreaking,
        classifyRuleId: REST_CLASSIFY_RULE_IDS.PARAMETER_STYLE,
        description: diffDescription(resolveParameterDescriptionTemplates('delimited style'))
      },
      ...openApiSpecificationExtensionRulesFunction(),
    },
  }

  const headersRules: CompareRules = {
    $: [nonBreaking, breaking, breaking],
    classifyRuleId: REST_CLASSIFY_RULE_IDS.HEADERS,
    '/*': {
      $: [nonBreaking, breaking, breaking],
      classifyRuleId: REST_CLASSIFY_RULE_IDS.HEADER,
      description: diffDescription(`[{{${TEMPLATE_PARAM_ACTION}}}] header '{{${GREP_TEMPLATE_PARAM_HEADER_NAME}}}'`),
      descriptionParamCalculator: headerParamsCalculator,
      '/allowEmptyValue': {
        $: allUnclassified,
        description: diffDescription(resolveHeaderDescriptionTemplates('allowEmptyValue status')),
      },
      '/allowReserved': {
        $: allUnclassified,
        description: diffDescription(resolveHeaderDescriptionTemplates('allowReserved status')),
      },
      '/deprecated': {
        $: allDeprecated,
        description: diffDescription(resolveHeaderDescriptionTemplates('deprecated status')),
      },
      '/description': {
        $: allAnnotation,
        description: diffDescription(resolveHeaderDescriptionTemplates('description')),
      },
      '/example': {
        $: allUnclassified,
        description: diffDescription(resolveHeaderDescriptionTemplates('example')),
        '/**': {
          $: allUnclassified,
          description: diffDescription(resolveHeaderDescriptionTemplates())
        }
      },
      '/examples': examplesRules,
      '/explode': {
        $: allUnclassified,
        description: diffDescription(resolveHeaderDescriptionTemplates('explode status')),
      },
      '/required': {
        $: [breaking, nonBreaking, breakingIfAfterTrue],
        classifyRuleId: [
          REST_CLASSIFY_RULE_IDS.HEADER_REQUIRED_ADD,
          REST_CLASSIFY_RULE_IDS.HEADER_REQUIRED_REMOVE,
          ({ after }) => after.value === true ? REST_CLASSIFY_RULE_IDS.HEADER_REQUIRED_REPLACE_AFTER_TRUE : REST_CLASSIFY_RULE_IDS.HEADER_REQUIRED_REPLACE_AFTER_NOT_TRUE,
        ],
        description: diffDescription(resolveHeaderDescriptionTemplates('required status')),
      },
      '/schema': ({ path }) => ({
        $: allBreaking,
        classifyRuleId: REST_CLASSIFY_RULE_IDS.HEADER_SCHEMA,
        ...isResponseSchema(path) ? responseSchemaRules : requestSchemaRules,
      }),
      '/style': {
        $: allUnclassified,
        description: diffDescription(resolveHeaderDescriptionTemplates('delimited style')),
      },
      ...openApiSpecificationExtensionRulesFunction(),
    },
  }

  const encodingRules: CompareRules = {
    $: [breaking, nonBreaking, breaking],
    classifyRuleId: REST_CLASSIFY_RULE_IDS.ENCODING,
    descriptionParamCalculator: encodingParamsCalculator,
    '/*': {
      description: diffDescription(resolveEncodingDescriptionTemplates()),
      '/allowReserved': {
        $: [nonBreaking, breaking, breaking],
        classifyRuleId: REST_CLASSIFY_RULE_IDS.ENCODING_ALLOW_RESERVED,
        description: diffDescription(resolveEncodingDescriptionTemplates())
      },
      '/contentType': {
        $: [nonBreaking, breaking, breaking],
        classifyRuleId: REST_CLASSIFY_RULE_IDS.ENCODING_CONTENT_TYPE,
        description: diffDescription(resolveEncodingDescriptionTemplates())
      },
      '/explode': {
        $: [nonBreaking, breaking, breaking],
        classifyRuleId: REST_CLASSIFY_RULE_IDS.ENCODING_EXPLODE,
        description: diffDescription(resolveEncodingDescriptionTemplates())
      },
      '/headers': headersRules,
      '/style': {
        $: [nonBreaking, breaking, breaking],
        classifyRuleId: REST_CLASSIFY_RULE_IDS.ENCODING_STYLE,
        description: diffDescription(resolveEncodingDescriptionTemplates())
      },
      ...openApiSpecificationExtensionRulesFunction(),
    },
  }

  const contentRules: CompareRules = {
    $: [nonBreaking, breaking, breaking],
    classifyRuleId: REST_CLASSIFY_RULE_IDS.CONTENT,
    mapping: contentMediaTypeMappingResolver,
    '/*': {
      $: [nonBreaking, breaking, nonBreaking],
      classifyRuleId: REST_CLASSIFY_RULE_IDS.MEDIA_TYPE,
      description: diffDescription([
        `[{{${TEMPLATE_PARAM_ACTION}}}] '{{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}}' media type {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_SCOPE}}} '{{${GREP_TEMPLATE_PARAM_RESPONSE_NAME}}}'`,
        `[{{${TEMPLATE_PARAM_ACTION}}}] '{{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}}' media type {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_COMPONENT_PATH}}}'`,
        `[{{${TEMPLATE_PARAM_ACTION}}}] '{{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}}' media type {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_SCOPE}}}`,
      ]),
      descriptionParamCalculator: contentParamsCalculator,
      '/encoding': encodingRules,
      '/example': {
        $: allAnnotation,
        description: diffDescription([
          `[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PROPERTY_NAME}}} {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_SCOPE}}} '{{${GREP_TEMPLATE_PARAM_RESPONSE_NAME}}}' ({{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}})`,
          `[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PROPERTY_NAME}}} {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_COMPONENT_PATH}}}' ({{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}})`,
          `[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PROPERTY_NAME}}} {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_SCOPE}}} ({{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}})`,
        ]),
        '/**': {
          $: allAnnotation,
          description: diffDescription([
            `[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PROPERTY_NAME}}} {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_SCOPE}}} '{{${GREP_TEMPLATE_PARAM_RESPONSE_NAME}}}' ({{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}})`,
            `[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PROPERTY_NAME}}} {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_COMPONENT_PATH}}}' ({{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}})`,
            `[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PROPERTY_NAME}}} {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_SCOPE}}} ({{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}})`,
          ]),
        }
      },
      '/examples': examplesRules,
      '/schema': ({ path }) => ({
        $: allBreaking,
        classifyRuleId: REST_CLASSIFY_RULE_IDS.MEDIA_TYPE_SCHEMA,
        ...isResponseSchema(path) ? responseSchemaRules : requestSchemaRules,
      }),
      ...openApiSpecificationExtensionRulesFunction(),
    },
  }

  const requestBodiesRules: CompareRules = {
    $: [nonBreaking, breaking, breaking],
    classifyRuleId: REST_CLASSIFY_RULE_IDS.REQUEST_BODY,
    description: diffDescription(`[{{${TEMPLATE_PARAM_ACTION}}}] request body`),
    descriptionParamCalculator: requestParamsCalculator,
    [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_REQUEST,
    '/content': contentRules,
    '/description': {
      $: allAnnotation,
      description: diffDescription(resolveRequestDescriptionTemplates('description'))
    },
    '/required': {
      $: [breaking, nonBreaking, breakingIfAfterTrue],
      classifyRuleId: [
        REST_CLASSIFY_RULE_IDS.REQUEST_BODY_REQUIRED_ADD,
        REST_CLASSIFY_RULE_IDS.REQUEST_BODY_REQUIRED_REMOVE,
        ({ after }) => after.value === true ? REST_CLASSIFY_RULE_IDS.REQUEST_BODY_REQUIRED_REPLACE_AFTER_TRUE : REST_CLASSIFY_RULE_IDS.REQUEST_BODY_REQUIRED_REPLACE_AFTER_NOT_TRUE,
      ],
      description: diffDescription(resolveRequestDescriptionTemplates('required status'))
    },
    ...openApiSpecificationExtensionRulesFunction(),
  }

  const responseRules: CompareRules = {
    $: [nonBreaking, breaking, (ctx) => nonBreakingIf(ctx.before.key.toString().toLocaleLowerCase() === ctx.after.key.toString().toLocaleLowerCase())],
    // Guard: responseRules is the `/*` wildcard in /responses containers, so its
    // classifyRuleId is merged into x-* extension diffs via getNodeRules. Return
    // RESPONSE_NOT_APPLICABLE for x-* keys so OOB is a no-op for those leaked diffs.
    classifyRuleId: [
      ({ after }) => String(after.key).startsWith('x-') ? REST_CLASSIFY_RULE_IDS.RESPONSE_NOT_APPLICABLE : REST_CLASSIFY_RULE_IDS.RESPONSE_ADD,
      ({ before }) => String(before.key).startsWith('x-') ? REST_CLASSIFY_RULE_IDS.RESPONSE_NOT_APPLICABLE : REST_CLASSIFY_RULE_IDS.RESPONSE_REMOVE,
      (ctx) => {
        if (String(ctx.before.key).startsWith('x-')) { return REST_CLASSIFY_RULE_IDS.RESPONSE_NOT_APPLICABLE }
        return ctx.before.key.toString().toLocaleLowerCase() === ctx.after.key.toString().toLocaleLowerCase()
          ? REST_CLASSIFY_RULE_IDS.RESPONSE_REPLACE_SAME_CODE
          : REST_CLASSIFY_RULE_IDS.RESPONSE_REPLACE_DIFFERENT_CODE
      },
    ],
    description: diffDescription(`[{{${TEMPLATE_PARAM_ACTION}}}] response '{{${GREP_TEMPLATE_PARAM_RESPONSE_NAME}}}'`),
    descriptionParamCalculator: responseParamsCalculator,
    '/content': contentRules,
    '/description': {
      $: allAnnotation,
      description: diffDescription([
        `[{{${TEMPLATE_PARAM_ACTION}}}] description {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_COMPONENT_PATH}}}'`,
        `[{{${TEMPLATE_PARAM_ACTION}}}] description {{${TEMPLATE_PARAM_PREPOSITION}}} response '{{${GREP_TEMPLATE_PARAM_RESPONSE_NAME}}}'`
      ]),
    },
    '/headers': headersRules,
    ...openApiSpecificationExtensionRulesFunction(),
  }

  const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'])

  const operationRule: CompareRules = {
    $: [nonBreaking, breaking, unclassified],
    // Guard: operationRule is the `/*` wildcard in pathItemObjectRules, so its
    // classifyRuleId is merged into ALL path-item child rules (servers, description,
    // etc.) via getNodeRules. Return OPERATION_NOT_APPLICABLE for non-HTTP-method
    // keys so the OOB classifier is a no-op for those leaked diffs.
    classifyRuleId: [
      ({ after }) => HTTP_METHODS.has(String(after.key)) ? REST_CLASSIFY_RULE_IDS.OPERATION_ADD : REST_CLASSIFY_RULE_IDS.OPERATION_NOT_APPLICABLE,
      ({ before }) => HTTP_METHODS.has(String(before.key)) ? REST_CLASSIFY_RULE_IDS.OPERATION_REMOVE : REST_CLASSIFY_RULE_IDS.OPERATION_NOT_APPLICABLE,
      (ctx) => HTTP_METHODS.has(String(ctx.before.key)) ? REST_CLASSIFY_RULE_IDS.OPERATION_REPLACE : REST_CLASSIFY_RULE_IDS.OPERATION_NOT_APPLICABLE,
    ],
    '/callbacks': {
      '/*': {
        //no support?
      },
    },
    '/deprecated': { $: allDeprecated },
    '/externalDocs': externalDocumentationRules,
    '/parameters': {
      $: [nonBreaking, apihubParametersRemovalClassifyRule, breaking],
      classifyRuleId: apihubParametersRemovalClassifyRuleIdRule,
      mapping: paramMappingResolver(2),
      ...parametersRules,
    },
    '/requestBody': requestBodiesRules,
    '/responses': {
      $: [nonBreaking, breaking, breaking],
      classifyRuleId: REST_CLASSIFY_RULE_IDS.OPERATION_RESPONSES,
      [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_RESPONSE,
      mapping: apihubCaseInsensitiveKeyMappingResolver,
      ...openApiSpecificationExtensionRulesFunction(),
      '/*': responseRules,
    },
    '/security': {
      $: operationSecurityClassifyRule,
      classifyRuleId: operationSecurityClassifyRuleIdRule,
      '/*': {
        $: operationSecurityItemClassifyRule,
        classifyRuleId: operationSecurityItemClassifyRuleIdRule,
        '/*': {
          $: allBreaking,
          classifyRuleId: REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_SCOPE_GROUP,
          mapping: deepEqualsUniqueItemsArrayMappingResolver,
          '/*': {
            $: [breaking, nonBreaking, breaking],
            classifyRuleId: REST_CLASSIFY_RULE_IDS.OPERATION_SECURITY_SCOPE,
            ignoreKeyDifference: true,
          },
        },
      },
    },
    '/servers': serversRules,
    '/tags': {
      ...operationAnnotationRule,
      mapping: deepEqualsUniqueItemsArrayMappingResolver,
      '/*': {
        ...operationAnnotationRule,
        [IGNORE_DIFFERENCE_IN_KEYS_RULE]: true,
      },
    },
    ...openApiSpecificationExtensionRulesFunction(),
    '/*': operationAnnotationRule,
  }

  const OAUTH_FLOW_TYPES = new Set(['implicit', 'password', 'clientCredentials', 'authorizationCode'])

  const oAuthFlowObjectRules: CompareRules = {
    $: [breaking, nonBreaking, breaking],
    // Guard: oAuthFlowObjectRules is the `/*` wildcard in oAuthFlowsObjectRules, so its
    // classifyRuleId is merged into x-* extension diffs. Return OAUTH_FLOW_NOT_APPLICABLE
    // for non-flow keys so OOB is a no-op for those leaked diffs.
    classifyRuleId: [
      ({ after }) => OAUTH_FLOW_TYPES.has(String(after.key)) ? REST_CLASSIFY_RULE_IDS.OAUTH_FLOW : REST_CLASSIFY_RULE_IDS.OAUTH_FLOW_NOT_APPLICABLE,
      ({ before }) => OAUTH_FLOW_TYPES.has(String(before.key)) ? REST_CLASSIFY_RULE_IDS.OAUTH_FLOW : REST_CLASSIFY_RULE_IDS.OAUTH_FLOW_NOT_APPLICABLE,
      (ctx) => OAUTH_FLOW_TYPES.has(String(ctx.before.key)) ? REST_CLASSIFY_RULE_IDS.OAUTH_FLOW : REST_CLASSIFY_RULE_IDS.OAUTH_FLOW_NOT_APPLICABLE,
    ],
    ...openApiSpecificationExtensionRulesFunction(),
  }

  const oAuthFlowsObjectRules: CompareRules = {
    $: [breaking, nonBreaking, breaking],
    classifyRuleId: REST_CLASSIFY_RULE_IDS.OAUTH_FLOWS,
    ...openApiSpecificationExtensionRulesFunction(),
    '/*': oAuthFlowObjectRules,
  }

  const tagObjectCompareRules: CompareRules = {
    $: allAnnotation,
    '/externalDocs': externalDocumentationRules,
    ...openApiSpecificationExtensionRulesFunction(allAnnotation),
    '/*': { $: allAnnotation },
  }
  const pathItemObjectRules = (options: OpenApi3RulesOptions): CompareRules => ({
    $: pathChangeClassifyRule,
    classifyRuleId: pathChangeClassifyRuleIdRule,
    mapping: options.mode === COMPARE_MODE_OPERATION ? singleOperationPathMappingResolver : methodMappingResolver,
    '/description': { $: allAnnotation },
    '/parameters': {
      $: [nonBreaking, breaking, breaking],
      classifyRuleId: REST_CLASSIFY_RULE_IDS.PATH_ITEM_PARAMETERS,
      mapping: paramMappingResolver(1),
      ...parametersRules,
    },
    '/servers': serversRules,
    '/summary': { $: allAnnotation },
    ...openApiSpecificationExtensionRulesFunction(),
    '/*': operationRule,
  })

  const componentsRule: CompareRules = {
    $: allNonBreaking,
    classifyRuleId: REST_CLASSIFY_RULE_IDS.COMPONENTS,
    [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_COMPONENTS,
    '/examples': examplesRules,
    '/headers': headersRules,
    '/parameters': {
      $: [nonBreaking, breaking, breaking],
      classifyRuleId: REST_CLASSIFY_RULE_IDS.COMPONENTS_PARAMETERS,
      ...parametersRules,
    },
    '/requestBodies': {
      $: [nonBreaking, breaking, breaking],
      classifyRuleId: REST_CLASSIFY_RULE_IDS.COMPONENTS_REQUEST_BODIES,
      '/*': requestBodiesRules,
    },
    '/responses': {
      $: [nonBreaking, breaking, breaking],
      classifyRuleId: REST_CLASSIFY_RULE_IDS.COMPONENTS_RESPONSES,
      '/*': responseRules,
    },
    '/schemas': {
      $: [nonBreaking, breaking, breaking],
      classifyRuleId: REST_CLASSIFY_RULE_IDS.COMPONENTS_SCHEMAS,
      '/*': () => ({
        $: allUnclassified,/*for mode One operation*/
        ...requestSchemaRules,
      }),
    },
    '/pathItems': {
      $: [nonBreaking, breaking, breaking],
      classifyRuleId: REST_CLASSIFY_RULE_IDS.COMPONENTS_PATH_ITEMS,
      '/*': pathItemObjectRules(options),
    },
    '/securitySchemes': {
      $: [breaking, nonBreaking, breaking],
      classifyRuleId: REST_CLASSIFY_RULE_IDS.COMPONENTS_SECURITY_SCHEMES,
      '/*': {
        $: [breaking, nonBreaking, breaking],
        classifyRuleId: REST_CLASSIFY_RULE_IDS.SECURITY_SCHEME,
        '/bearerFormat': { $: allAnnotation },
        '/description': { $: allAnnotation },
        '/flows': oAuthFlowsObjectRules,
        '/in': { $: [breaking, nonBreaking, breaking], classifyRuleId: REST_CLASSIFY_RULE_IDS.SECURITY_SCHEME_PROPERTY },
        '/name': { $: [breaking, nonBreaking, breaking], classifyRuleId: REST_CLASSIFY_RULE_IDS.SECURITY_SCHEME_PROPERTY },
        '/openIdConnectUrl': { $: allAnnotation },
        '/scheme': { $: [breaking, nonBreaking, breaking], classifyRuleId: REST_CLASSIFY_RULE_IDS.SECURITY_SCHEME_PROPERTY },
        '/type': { $: [breaking, nonBreaking, breaking], classifyRuleId: REST_CLASSIFY_RULE_IDS.SECURITY_SCHEME_PROPERTY },
        ...openApiSpecificationExtensionRulesFunction(),
      },
    },
    ...openApiSpecificationExtensionRulesFunction(),
  }

  return {
    ...openApiSpecificationExtensionRulesFunction(),
    '/openapi': documentAnnotationRule,
    '/info': {
      ...documentAnnotationRule,
      ...openApiSpecificationExtensionRulesFunction(allAnnotation),
      '/contact': {
        ...openApiSpecificationExtensionRulesFunction(allAnnotation),
      },
      '/license': {
        ...openApiSpecificationExtensionRulesFunction(allAnnotation),
      },
      '/**': documentAnnotationRule,
    },
    '/servers': serversRules,
    '/paths': {
      $: allUnclassified,
      classifyRuleId: REST_CLASSIFY_RULE_IDS.PATHS,
      mapping: options.mode === COMPARE_MODE_OPERATION ? singleOperationPathMappingResolver : pathMappingResolver,
      syntheticDiffs: options.operationSyntheticDiffs && syntheticDiffsResolver,
      '/*': pathItemObjectRules(options),
      ...openApiSpecificationExtensionRulesFunction(),
    },
    '/components': componentsRule,
    '/security': {
      $: globalSecurityClassifyRule,
      classifyRuleId: globalSecurityClassifyRuleIdRule,
      '/*': { $: globalSecurityItemClassifyRule, classifyRuleId: globalSecurityItemClassifyRuleIdRule },
    },
    '/tags': {
      $: allAnnotation,
      '/*': tagObjectCompareRules,
    },
    '/externalDocs': externalDocumentationRules,
  }
}

const resolveHeaderDescriptionTemplates = (details: string = `{{${TEMPLATE_PARAM_PROPERTY_NAME}}}`): DescriptionTemplates => ([
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} header '{{${GREP_TEMPLATE_PARAM_HEADER_NAME}}}'`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} header '{{${GREP_TEMPLATE_PARAM_HEADER_NAME}}}' in response '{{${GREP_TEMPLATE_PARAM_RESPONSE_NAME}}}'`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} header '{{${GREP_TEMPLATE_PARAM_HEADER_NAME}}}' in '{{${TEMPLATE_PARAM_RESPONSE_PATH}}}'`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_HEADER_PATH}}}'`,
])

const resolveParameterDescriptionTemplates = (details: string = `{{${TEMPLATE_PARAM_PROPERTY_NAME}}}`): DescriptionTemplates => ([
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_PARAMETER_LOCATION}}} parameter '{{${TEMPLATE_PARAM_PARAMETER_PATH}}}'`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_PARAMETER_LOCATION}}} parameter '{{${GREP_TEMPLATE_PARAM_PARAMETER_NAME}}}'`
])

const resolveRequestDescriptionTemplates = (details: string = `{{${TEMPLATE_PARAM_PROPERTY_NAME}}}`): DescriptionTemplates => ([
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_REQUEST_PATH}}}'`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} request body`,
])

const resolveExamplesDescriptionTemplates = (details: string = `{{${TEMPLATE_PARAM_PROPERTY_NAME}}}`): DescriptionTemplates => ([
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} example '{{${TEMPLATE_PARAM_EXAMPLE_PATH}}}'`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} example '{{${GREP_TEMPLATE_PARAM_EXAMPLE_NAME}}}' {{${TEMPLATE_PARAM_PLACE}}}`,
])

const resolveEncodingDescriptionTemplates = (): DescriptionTemplates => ([
  `[{{${TEMPLATE_PARAM_ACTION}}}] Encoding details {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${GREP_TEMPLATE_PARAM_ENCODING_NAME}}}' {{${TEMPLATE_PARAM_PLACE}}}`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] Encoding details ({{${TEMPLATE_PARAM_PROPERTY_NAME}}}) {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${GREP_TEMPLATE_PARAM_ENCODING_NAME}}}' {{${TEMPLATE_PARAM_PLACE}}}`
])
