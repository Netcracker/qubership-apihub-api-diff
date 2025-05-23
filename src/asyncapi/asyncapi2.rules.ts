import {
  addNonBreaking,
  allAnnotation,
  allBreaking,
  allNonBreaking,
  allUnclassified,
  reverseClassifyRuleTransformer,
  transformCompareRules,
} from '../core'
import { jsonSchemaRules } from '../jsonSchema'
import type { CompareMode, CompareRules } from '../types'
import { SPEC_TYPE_JSON_SCHEMA_07 } from '@netcracker/qubership-apihub-api-unifier'

export const asyncApi2Rules = (_: CompareMode): CompareRules => {
  const subSchemaRules = transformCompareRules(jsonSchemaRules({
    additionalRules: {},
    version: SPEC_TYPE_JSON_SCHEMA_07,
  }), reverseClassifyRuleTransformer)
  const pubSchemaRules = jsonSchemaRules({
    additionalRules: {},
    version: SPEC_TYPE_JSON_SCHEMA_07,
  })

  const correlationIdRules: CompareRules = {
    $: addNonBreaking,
    '/location': { $: addNonBreaking },
    '/description': { $: allAnnotation },
  }

  const bindingsRule: CompareRules = {
    $: allUnclassified,
    '/*': {
      $: allUnclassified,
      '/*': { $: allUnclassified },
      '/query': () => subSchemaRules,
      '/headers': () => pubSchemaRules,
    },
  }

  const commonRules: CompareRules = {
    '/summary': { $: allAnnotation },
    '/tags': { $: allAnnotation },
    '/externalDocs': { $: allAnnotation },
    '/bindings': bindingsRule,
  }

  const pubsubTraitsRules: CompareRules = {
    $: addNonBreaking,
    '/*': { $: addNonBreaking },
    '/operationId': { $: allAnnotation },
    '/description': { $: allAnnotation },
    ...commonRules,
  }

  const messageTraitsRules: CompareRules = {
    $: addNonBreaking,
    '/*': { $: addNonBreaking },
    '/headers': { $: allUnclassified },
    '/correlationId': correlationIdRules,
    '/schemaFormat': { $: allBreaking },
    '/contentType': { $: addNonBreaking },
    '/name': { $: allNonBreaking },
    '/title': { $: allNonBreaking },
    '/examples': { $: allAnnotation },
    ...commonRules,
  }

  const messageRules = (sub = false): CompareRules => ({
    $: allBreaking,
    '/headers': { $: allUnclassified },
    '/correlationId': correlationIdRules,
    '/schemaFormat': { $: allBreaking },
    '/contentType': { $: addNonBreaking },
    '/name': { $: allNonBreaking },
    '/title': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/examples': { $: allAnnotation },
    '/traits': messageTraitsRules,
    '/payload': () => ({
      ...sub ? subSchemaRules : pubSchemaRules,
      $: allBreaking,
    }),
    ...commonRules,
  })

  const pubsubRules = (sub = false): CompareRules => ({
    $: addNonBreaking,
    '/operationId': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/traits': pubsubTraitsRules,
    '/message': messageRules(sub),
    ...commonRules,
  })

  const infoRules: CompareRules = {
    $: allAnnotation,
    '/version': { $: allAnnotation },
    '/termsOfService': { $: allAnnotation },
    '/license': {
      $: allAnnotation,
      '/name': { $: allAnnotation },
      '/url': { $: allAnnotation },
    },
    '/title': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/contact': {
      $: allAnnotation,
      '/name': { $: allAnnotation },
      '/url': { $: allAnnotation },
      '/email': { $: allAnnotation },
    },
  }

  const serversRules: CompareRules = {
    $: allAnnotation,
    '/*': {
      $: allAnnotation,
      '/url': { $: allAnnotation },
      '/description': { $: allAnnotation },
      '/protocol': { $: allAnnotation },
      '/protocolVersion': { $: allAnnotation },
      '/variables': {
        $: allAnnotation,
        '/*': {
          $: allAnnotation,
          '/enum': {
            $: allAnnotation,
            '/*': { $: allAnnotation },
          },
          '/default': { $: allAnnotation },
          '/description': { $: allAnnotation },
          '/examples': { $: allAnnotation },
        },
      },
      '/security': {
        $: allAnnotation,
        '/*': { $: allAnnotation },
      },
      '/bindings': bindingsRule,
    },
  }

  const channelRules: CompareRules = {
    $: addNonBreaking,
    '/description': { $: allAnnotation },
    '/bindings': bindingsRule,
    '/subscribe': pubsubRules(true),
    '/publish': pubsubRules(false),
    '/parameters': {
      $: allBreaking,
      '/*': {
        $: addNonBreaking,
        '/description': { $: allAnnotation },
        '/schema': () => ({
          ...pubSchemaRules,
          $: allBreaking,
        }),
        '/location': { $: allBreaking },
      },
    },
  }

  return {
    '/asyncapi': { $: allAnnotation },
    '/id': { $: allAnnotation },
    '/defaultContentType': { $: allBreaking },
    '/info': infoRules,
    '/servers': serversRules,
    '/channels': {
      $: addNonBreaking,
      '/*': channelRules,
    },
    '/components': {
      '/*': { $: allAnnotation },
    },
    '/tags': { $: allAnnotation },
    '/externalDocs': { $: allAnnotation },
  }
}
