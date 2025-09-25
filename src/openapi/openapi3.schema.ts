import {
  jsonSchemaAdapter,
  jsonSchemaRules,
  NativeAnySchemaFactory,
  resolveSchemaDescriptionTemplates,
} from '../jsonSchema'
import {
  allAnnotation,
  allUnclassified,
  breaking,
  breakingIf,
  breakingIfAfterTrue,
  diffDescription,
  nonBreaking,
  reverseClassifyRuleTransformer,
  transformCompareRules,
} from '../core'
import type { OpenApi3SchemaRulesOptions } from './openapi3.types'
import { CompareRules, AdapterResolver } from '../types'
import {
  JsonSchemaSpecVersion,
  normalize,
  type OpenApiSpecVersion,
  OriginsMetaRecord,
  SPEC_TYPE_JSON_SCHEMA_04,
  SPEC_TYPE_JSON_SCHEMA_07,
  SPEC_TYPE_OPEN_API_30,
  SPEC_TYPE_OPEN_API_31,
  JSON_SCHEMA_PROPERTY_NULLABLE,
  JSON_SCHEMA_PROPERTY_ANY_OF,
  JSON_SCHEMA_PROPERTY_ONE_OF,
  JSON_SCHEMA_PROPERTY_TYPE,
  JSON_SCHEMA_NODE_TYPE_NULL,
  setOrigins,
} from '@netcracker/qubership-apihub-api-unifier'
import { schemaParamsCalculator } from './openapi3.description.schema'
import { isObject, isArray } from '../utils'

const SPEC_TYPE_TO_VERSION: Record<OpenApiSpecVersion, string> = {
  [SPEC_TYPE_OPEN_API_30]: '3.0.0',
  [SPEC_TYPE_OPEN_API_31]: '3.1.0',
}

const openApiJsonSchemaAnyFactory: (version: OpenApiSpecVersion) => NativeAnySchemaFactory = (version) => (schema, schemaOrigins, opt) => {
  const normalizedSpec: any = normalize({
    openapi: SPEC_TYPE_TO_VERSION[version],
    components: {
      schemas: {
        empty: schema,
        [opt.originsFlag]: {
          empty: schemaOrigins,
        } as OriginsMetaRecord,
      },
      [opt.originsFlag]: {
        schemas: schemaOrigins,
      } as OriginsMetaRecord,
    },
    [opt.originsFlag]: {
      components: schemaOrigins,
    } as OriginsMetaRecord,
  }, {
    ...opt,
    // schema is already normalized, resolveRef is disabled and originsAlreadyDefined is true in order to prevent origins override
    resolveRef: false,
    originsAlreadyDefined: true,
    validate: false,
    allowNotValidSyntheticChanges: false,
  })
  return normalizedSpec.components.schemas.empty as Record<PropertyKey, unknown>
}

// Helper function to check if a schema has null type
const hasNullType = (schema: unknown): boolean => {
  if (!isObject(schema)) return false
  
  // Check direct type property
  const type = schema[JSON_SCHEMA_PROPERTY_TYPE]
  if (type === JSON_SCHEMA_NODE_TYPE_NULL) return true
  if (isArray(type) && type.includes(JSON_SCHEMA_NODE_TYPE_NULL)) return true
  
  // Check in combiners (anyOf, oneOf)
  for (const combiner of [JSON_SCHEMA_PROPERTY_ANY_OF, JSON_SCHEMA_PROPERTY_ONE_OF] as const) {
    const combinerArray = schema[combiner]
    if (isArray(combinerArray)) {
      for (const item of combinerArray) {
        if (hasNullType(item)) return true
      }
    }
  }
  
  return false
}

// Builds a "null" type schema carrying over relevant origins from source
// const buildNullTypeWithOrigins = (
//   valueWithoutNullable: Record<PropertyKey, unknown>,
//   originsFlag: PropertyKey,
// ): Record<PropertyKey, unknown> => {
//   const nullTypeObject: Record<PropertyKey, unknown> = {
//     [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_NULL,
//   }
//   const valueOrigins = valueWithoutNullable[originsFlag] as Record<PropertyKey, unknown> | undefined
//
//   if (valueWithoutNullable.title) {
//     nullTypeObject.title = valueWithoutNullable.title
//     const titleOrigin = valueOrigins && (valueOrigins as Record<PropertyKey, unknown>).title
//     if (titleOrigin !== undefined) {
//       nullTypeObject[originsFlag] = { title: titleOrigin }
//     }
//   }
//
//   const nullableOrigin = valueOrigins && (valueOrigins as Record<PropertyKey, unknown>).nullable
//   if (nullableOrigin !== undefined) {
//     const existing = (nullTypeObject[originsFlag] as Record<PropertyKey, unknown>) || {}
//     nullTypeObject[originsFlag] = { ...existing, nullable: nullableOrigin }
//   }
//
//   return nullTypeObject
// }

const buildNullTypeWithOrigins = (
  valueWithoutNullable: Record<PropertyKey, unknown>,
  originsFlag: PropertyKey,
  syntheticTitleFlag: PropertyKey
): Record<PropertyKey, unknown> => {
  const nullTypeObject: Record<PropertyKey, unknown> = {
    [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_NULL,
  }

  const valueOrigins = valueWithoutNullable[originsFlag] as Record<PropertyKey, unknown> | undefined
  const origins: Record<PropertyKey, unknown> = {}

  if (valueWithoutNullable.title) {
    nullTypeObject.title = valueWithoutNullable.title
    if (valueOrigins?.title !== undefined) {
      origins.title = valueOrigins.title
    }
  }

  if (valueOrigins?.nullable !== undefined) {

    // origins.nullable = valueOrigins.nullable

    const getOriginParent = (item: unknown) => ({
      value: JSON_SCHEMA_PROPERTY_TYPE,
      parent: (item as any)?.parent,
    })

    origins[JSON_SCHEMA_PROPERTY_TYPE] = Array.isArray(valueOrigins.nullable)
      ? valueOrigins.nullable.map(getOriginParent)
      : getOriginParent(valueOrigins.nullable)
  }

  if (Object.keys(origins).length > 0) {
    nullTypeObject[originsFlag] = origins
  }

  return nullTypeObject
}

// Adapter to transform JSON Schemas used in OpenAPI 3.0 schemas to JSON Schemas used in OpenAPI 3.1 for comparison
const jsonSchemaOas30to31Adapter: AdapterResolver = (value, reference, ctx) => {
  if (!isObject(value) || !isObject(reference)) {
    return value
  }

  if (value[JSON_SCHEMA_PROPERTY_NULLABLE] !== true) {
    return value
  }

  if (!hasNullType(reference)) {
    return value
  }

  const originsFlag: PropertyKey = ctx.options.originsFlag
  // @ts-ignore
  const syntheticTitleFlag: PropertyKey = ctx.options.syntheticTitleFlag

  return ctx.transformer(value, 'nullable-to-anyof', (current) => {
    const { [JSON_SCHEMA_PROPERTY_NULLABLE]: _nullable, ...valueWithoutNullable } = current as Record<PropertyKey, unknown>

    const nullTypeObject = buildNullTypeWithOrigins(valueWithoutNullable, originsFlag, syntheticTitleFlag)

    const anyOfArray = [valueWithoutNullable, nullTypeObject]

    const result: Record<PropertyKey, unknown> = { [JSON_SCHEMA_PROPERTY_ANY_OF]: anyOfArray }

    setOrigins(result, JSON_SCHEMA_PROPERTY_ANY_OF, originsFlag, ctx.valueOrigins)
    setOrigins(anyOfArray, 0, originsFlag, ctx.valueOrigins)
    setOrigins(anyOfArray, 1, originsFlag, ctx.valueOrigins)

    return result
  })
}

export const openApiSchemaRules = (options: OpenApi3SchemaRulesOptions): CompareRules => {
  //todo find better way to remove this 'version specific' copy-paste with normalize
  const jsonSchemaVersion: JsonSchemaSpecVersion = options.version === SPEC_TYPE_OPEN_API_30 ? SPEC_TYPE_JSON_SCHEMA_04 : SPEC_TYPE_JSON_SCHEMA_07

  const schemaRules = jsonSchemaRules({
    additionalRules: {
      adapter: [
        ...(options.version === SPEC_TYPE_OPEN_API_31 ? [jsonSchemaOas30to31Adapter] : []),
        jsonSchemaAdapter(openApiJsonSchemaAnyFactory(options.version)),
      ],
      descriptionParamCalculator: schemaParamsCalculator,
      description: diffDescription(resolveSchemaDescriptionTemplates()),
      // openapi extensions
      '/nullable': {
        $: [
          nonBreaking,
          breaking,
          ({ after }) => breakingIf(!after.value),
          breakingIfAfterTrue,
          nonBreaking,
          ({ after }) => breakingIf(!!after.value),
        ],
        description: diffDescription(resolveSchemaDescriptionTemplates('nullable status'))
      },
      '/discriminator': { $: allUnclassified },
      '/example': { $: allAnnotation, description: diffDescription(resolveSchemaDescriptionTemplates('example')) },
      '/externalDocs': {
        $: allAnnotation,
        description: diffDescription(resolveSchemaDescriptionTemplates('externalDocs')),
        '/description': {
          $: allAnnotation,
          description: diffDescription(resolveSchemaDescriptionTemplates('description of externalDocs'))
        },
        '/url': {
          $: allAnnotation,
          description: diffDescription(resolveSchemaDescriptionTemplates('url of externalDocs'))
        },
        '/*': {
          $: allAnnotation,
          description: diffDescription(resolveSchemaDescriptionTemplates('externalDocs'))
        },
      },
      '/xml': {},
    },
    version: jsonSchemaVersion,
  })

  return options.response
    ? transformCompareRules(schemaRules, reverseClassifyRuleTransformer)
    : schemaRules
}

