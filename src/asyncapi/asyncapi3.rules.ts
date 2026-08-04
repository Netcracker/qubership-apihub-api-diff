import {
  addNonBreaking,
  allAnnotation,
  allBreaking,
  allDeprecated,
  allNonBreaking,
  allUnclassified,
  arrayMappingResolver,
  breaking,
  createPropertyMappingResolver,
  deepEqualsUniqueItemsArrayMappingResolver,
  nonBreaking,
  objectMappingResolver,
  unclassified,
} from '../core'
import {
  CompareRules,
  START_NEW_COMPARE_SCOPE_RULE,
} from '../types'
import { AsyncApi3RulesOptions } from './asyncapi3.types'
import { semanticMappingWrapper } from './asyncapi3.mapping'
import { schemaOrMultiFormatSchemaRules } from './asyncapi3.schema'
import { asyncApiSpecificationExtensionRulesFunction } from './asyncapi3.compare.rules'
import {
  COMPARE_SCOPE_COMPONENTS,
  COMPARE_SCOPE_RECEIVE,
  COMPARE_SCOPE_SEND,
} from './asyncapi3.const'
import { externalDocumentationRules } from './asyncapi3.rules.common'
import { bindingsRules } from './asyncapi3.bindings'
import { ASYNCAPI_ACTION_SEND } from '@netcracker/qubership-apihub-api-unifier'

/**
 * Keep consisten ordering for the rules
 * - Classify rule ($) for the node itself first
 * - Other rules for the node itself in the order they listed in specification
 * - Children: specific keys, then prefix rules, then '/*', then '/**' *
 */

export const asyncApi3Rules = (options: AsyncApi3RulesOptions): CompareRules => {
  const firstReferenceKeyMapping = options.firstReferenceKeyProperty
    ? createPropertyMappingResolver(options.firstReferenceKeyProperty)
    : undefined

  const semanticEntityMappingEnabled = options.asyncApiSemanticEntityMapping ?? true
  const semanticMapping = semanticMappingWrapper(semanticEntityMappingEnabled)
  /**
   * Only the semantic pass can map one key onto a different one at these sites - every base
   * resolver used here maps a key to itself - so the rename suppression it needs is applied
   * only when the semantic pass is on. Spread at the element rule, never by mutating the shared
   * `messageRules` / `channelRules` objects, so it stays per-site.
   */
  const suppressSemanticRename: CompareRules = semanticEntityMappingEnabled ? { ignoreKeyDifference: true } : {}

  const tagRules: CompareRules = {
    $: allAnnotation,
    '/name': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/externalDocs': externalDocumentationRules,
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  const tagsRules: CompareRules = {
    $: allAnnotation,
    mapping: deepEqualsUniqueItemsArrayMappingResolver,
    '/*': tagRules,
  }

  const oAuthFlowRules: CompareRules = {
    $: [breaking, nonBreaking, breaking],
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  const oAuthFlowsRules: CompareRules = {
    $: [breaking, nonBreaking, breaking],
    ...asyncApiSpecificationExtensionRulesFunction(),
    '/*': oAuthFlowRules,
  }

  const securitySchemeRules: CompareRules = {
    $: [breaking, nonBreaking, breaking],
    '/type': { $: [breaking, nonBreaking, breaking] },
    '/description': { $: allAnnotation },
    '/name': { $: [breaking, nonBreaking, breaking] },
    '/in': { $: [breaking, nonBreaking, breaking] },
    '/scheme': { $: [breaking, nonBreaking, breaking] },
    '/bearerFormat': { $: allAnnotation },
    '/flows': oAuthFlowsRules,
    '/openIdConnectUrl': { $: allAnnotation },
    '/scopes': {
      $: [nonBreaking, breaking, breaking],
      '/*': { $: [nonBreaking, breaking, breaking] },
    },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  const serverVariableRules: CompareRules = {
    $: allAnnotation,
    '/enum': {
      $: allAnnotation,
      mapping: deepEqualsUniqueItemsArrayMappingResolver,
      '/*': { $: allAnnotation, ignoreKeyDifference: true },
    },
    '/default': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/examples': {
      $: allAnnotation,
      '/*': { $: allAnnotation },
    },
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  // Server rules
  const serverRules: CompareRules = {
    $: allAnnotation,
    '/host': { $: allAnnotation },
    '/protocol': { $: allAnnotation },
    '/protocolVersion': { $: allAnnotation },
    '/pathname': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/title': { $: allAnnotation },
    '/summary': { $: allAnnotation },
    '/variables': {
      $: allAnnotation,
      '/*': serverVariableRules,
    },
    '/security': {
      $: allAnnotation,
      '/*': {
        $: allAnnotation,
        '/*': { $: allAnnotation },
      },
    },
    '/tags': tagsRules,
    '/externalDocs': externalDocumentationRules,
    '/bindings': bindingsRules,
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  const serversRules: CompareRules = {
    $: allAnnotation,
    '/*': serverRules,
  }

  const correlationIdRules: CompareRules = {
    $: allUnclassified,
    '/description': { $: allUnclassified },
    '/location': { $: allUnclassified },
    ...asyncApiSpecificationExtensionRulesFunction(allUnclassified),
  }

  const messageExampleRules: CompareRules = {
    $: allAnnotation,
    '/headers': {
      $: allAnnotation,
      '/**': { $: allAnnotation },
    },
    '/payload': {
      $: allAnnotation,
      '/**': { $: allAnnotation },
    },
    '/name': { $: allAnnotation },
    '/summary': { $: allAnnotation },
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  const messageExamplesRules: CompareRules = {
    $: allAnnotation,
    '/*': messageExampleRules,
  }

  const messageRules: CompareRules = {
    $: allUnclassified,
    '/headers': (ctx) => ({ ...schemaOrMultiFormatSchemaRules(ctx), $: allBreaking }),
    '/correlationId': correlationIdRules,
    '/contentType': { $: addNonBreaking },
    '/name': { $: allAnnotation },
    '/title': { $: allAnnotation },
    '/summary': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/tags': tagsRules,
    '/externalDocs': externalDocumentationRules,
    '/bindings': bindingsRules,
    '/examples': messageExamplesRules,
    '/payload': (ctx) => ({ ...schemaOrMultiFormatSchemaRules(ctx), $: allBreaking }),
    '/traits': {
      $: allUnclassified,
      '/*': {
        $: allUnclassified,
        '/*': { $: allUnclassified },
        '/**': { $: allUnclassified },
      },
    },
    ...asyncApiSpecificationExtensionRulesFunction(allUnclassified),
  }

  const parameterRules: CompareRules = {
    $: allUnclassified,
    '/enum': {
      $: allUnclassified,
      mapping: deepEqualsUniqueItemsArrayMappingResolver,
      '/*': { $: allUnclassified, ignoreKeyDifference: true },
    },
    '/default': { $: allUnclassified },
    '/description': { $: allAnnotation },
    '/examples': {
      $: allAnnotation,
      '/*': { $: allAnnotation },
    },
    '/location': { $: allUnclassified },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  const channelRules: CompareRules = {
    $: addNonBreaking,
    '/address': { $: allUnclassified },
    '/messages': {
      $: addNonBreaking,
      // The parent channel already fixes the address, so the payload identity alone identifies
      // a message here.
      mapping: semanticMapping(objectMappingResolver, index => index.payloadIdentityOf),
      '/*': { ...messageRules, ...suppressSemanticRename },
    },
    '/title': { $: allAnnotation },
    '/summary': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/servers': {
      $: allUnclassified,
      mapping: firstReferenceKeyMapping,
      '/*': { $: allUnclassified, ignoreKeyDifference: true },
    },
    '/parameters': {
      $: allUnclassified,
      '/*': parameterRules,
    },
    '/tags': tagsRules,
    '/externalDocs': externalDocumentationRules,
    '/bindings': bindingsRules,
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  const operationReplyAddressRules: CompareRules = {
    $: allUnclassified,
    '/description': { $: allAnnotation },
    '/location': { $: allUnclassified },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  const operationReplyRules = (isSendAction: boolean): CompareRules => ({
    $: allUnclassified,
    [START_NEW_COMPARE_SCOPE_RULE]: isSendAction ? COMPARE_SCOPE_RECEIVE : COMPARE_SCOPE_SEND,
    '/address': operationReplyAddressRules,
    '/channel': channelRules,
    '/messages': {
      $: allUnclassified,
      // Gated on the reply naming a concrete channel with an address: a `reply.address` runtime
      // expression is not an anchor, and the parent operation's address is the wrong one.
      mapping: semanticMapping(arrayMappingResolver, index => index.replyPayloadIdentityOf),
      '/*': { ...messageRules, ...suppressSemanticRename },
    },
    ...asyncApiSpecificationExtensionRulesFunction(),
  })

  const operationTraitsRules: CompareRules = {
    $: allUnclassified,
    '/*': {
      $: allUnclassified,
      '/*': { $: allUnclassified },
      '/**': { $: allUnclassified },
    },
  }

  // Operation rules factory based on action type
  const operationRules = (isSendAction: boolean): CompareRules => ({
    $: [nonBreaking, breaking, unclassified],
    [START_NEW_COMPARE_SCOPE_RULE]: isSendAction ? COMPARE_SCOPE_SEND : COMPARE_SCOPE_RECEIVE,
    '/title': { $: allAnnotation },
    '/summary': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/security': {
      $: allUnclassified,
      '/*': securitySchemeRules,
    },
    '/tags': tagsRules,
    '/externalDocs': externalDocumentationRules,
    '/bindings': bindingsRules,
    '/reply': operationReplyRules(isSendAction),
    '/action': { $: allBreaking },
    '/channel': channelRules,
    '/traits': operationTraitsRules,
    '/messages': {
      $: allUnclassified,
      // The parent operation fixes both the action and the address, so the payload identity alone
      // identifies a message here. `ignoreKeyDifference` below predates this and is required by
      // the first-reference-key resolver, which already remaps indices on reorder.
      mapping: semanticMapping(
        firstReferenceKeyMapping ?? arrayMappingResolver,
        index => index.payloadIdentityOf,
      ),
      '/*': {
        ...messageRules,
        $: [nonBreaking, breaking, unclassified],
        ignoreKeyDifference: true
      },
    },
    ...asyncApiSpecificationExtensionRulesFunction(),
  })

  const operationsRules: CompareRules = {
    $: addNonBreaking,
    mapping: semanticMapping(objectMappingResolver, index => index.identityOfOperation),
    '/*': ({ value }) => {
      // Determine if this is a send or receive operation based on the action field
      const action = (value as Record<string, unknown>)?.action
      const isSendAction = action === ASYNCAPI_ACTION_SEND
      return { ...operationRules(isSendAction), ...suppressSemanticRename }
    },
  }

  // Components rules
  const componentsRules: CompareRules = {
    $: allNonBreaking,
    [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_COMPONENTS,
    '/schemas': {
      $: [nonBreaking, breaking, breaking],
      '/*': (ctx) => ({ $: allUnclassified, ...schemaOrMultiFormatSchemaRules(ctx) }),
    },
    '/servers': {
      $: [nonBreaking, breaking, breaking],
      '/*': serverRules,
    },
    '/channels': {
      $: [nonBreaking, breaking, breaking],
      mapping: semanticMapping(objectMappingResolver, index => index.identityOfChannel),
      '/*': { ...channelRules, ...suppressSemanticRename },
    },
    '/operations': {
      $: [nonBreaking, breaking, breaking],
      mapping: semanticMapping(objectMappingResolver, index => index.identityOfOperation),
      '/*': ({ value }) => {
        const action = (value as Record<string, unknown>)?.action
        const isSendAction = action === ASYNCAPI_ACTION_SEND
        return { ...operationRules(isSendAction), ...suppressSemanticRename }
      },
    },
    '/messages': {
      $: allUnclassified,
      // No parent fixes the action or the address here, so a components message needs the
      // spec-wide index to learn who references it.
      mapping: semanticMapping(objectMappingResolver, index => index.identityOfMessage),
      '/*': { ...messageRules, ...suppressSemanticRename },
    },
    '/securitySchemes': {
      $: [breaking, nonBreaking, breaking],
      '/*': securitySchemeRules,
    },
    '/serverVariables': {
      $: [nonBreaking, breaking, breaking],
      '/*': serverVariableRules,
    },
    '/parameters': {
      $: [nonBreaking, breaking, breaking],
      '/*': parameterRules,
    },
    '/correlationIds': {
      $: [nonBreaking, breaking, breaking],
      '/*': correlationIdRules,
    },
    '/replies': {
      $: [nonBreaking, breaking, breaking],
      '/*': operationReplyRules(true),
    },
    '/replyAddresses': {
      $: [nonBreaking, breaking, breaking],
      '/*': operationReplyAddressRules,
    },
    '/externalDocs': {
      $: [nonBreaking, breaking, breaking],
      '/*': externalDocumentationRules,
    },
    '/tags': {
      $: [nonBreaking, breaking, breaking],
      '/*': tagRules,
    },
    '/operationTraits': {
      $: [nonBreaking, breaking, breaking],
      '/*': {
        $: addNonBreaking,
        '/*': { $: allUnclassified },
        '/**': { $: allUnclassified },
      },
    },
    '/messageTraits': {
      $: [nonBreaking, breaking, breaking],
      '/*': {
        $: addNonBreaking,
        '/*': { $: allUnclassified },
        '/**': { $: allUnclassified },
      },
    },
    '/serverBindings': {
      $: [nonBreaking, breaking, breaking],
      '/*': bindingsRules,
    },
    '/channelBindings': {
      $: [nonBreaking, breaking, breaking],
      '/*': bindingsRules,
    },
    '/operationBindings': {
      $: [nonBreaking, breaking, breaking],
      '/*': bindingsRules,
    },
    '/messageBindings': {
      $: [nonBreaking, breaking, breaking],
      '/*': bindingsRules,
    },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  // Contact rules (info.contact)
  const contactRules: CompareRules = {
    $: allAnnotation,
    '/name': { $: allAnnotation },
    '/url': { $: allAnnotation },
    '/email': { $: allAnnotation },
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  // License rules (info.license)
  const licenseRules: CompareRules = {
    $: allAnnotation,
    '/name': { $: allAnnotation },
    '/url': { $: allAnnotation },
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  // Info rules
  const infoRules: CompareRules = {
    $: allAnnotation,
    '/title': { $: allAnnotation },
    '/version': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/termsOfService': { $: allAnnotation },
    '/contact': contactRules,
    '/license': licenseRules,
    '/tags': tagsRules,
    '/externalDocs': externalDocumentationRules,
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  return {
    '/asyncapi': { $: allAnnotation },
    '/id': { $: allAnnotation },
    '/info': infoRules,
    '/servers': serversRules,
    '/defaultContentType': { $: allUnclassified },
    '/channels': {
      $: allUnclassified,
      mapping: semanticMapping(objectMappingResolver, index => index.identityOfChannel),
      '/*': { ...channelRules, ...suppressSemanticRename },
    },
    '/operations': operationsRules,
    '/components': componentsRules,
    ...asyncApiSpecificationExtensionRulesFunction(),
  }
}

