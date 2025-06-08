import { anyArrayKeys, JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { breaking, DiffAction, nonBreaking, PARENT_JUMP, strictResolveValueFromContext } from './core'
import {
  CompareContext,
  Diff,
  DiffAdd,
  DiffRemove,
  DiffRename,
  DiffReplace,
  DiffType,
  NodeContext,
  PrimitiveType,
} from './types'
import {
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
  JSON_SCHEMA_NODE_TYPE_ARRAY,
  JSON_SCHEMA_NODE_TYPE_BOOLEAN,
  JSON_SCHEMA_NODE_TYPE_INTEGER,
  JSON_SCHEMA_NODE_TYPE_NULL,
  JSON_SCHEMA_NODE_TYPE_NUMBER,
  JSON_SCHEMA_NODE_TYPE_OBJECT,
  JSON_SCHEMA_NODE_TYPE_STRING,
  JsonSchemaNodesNormalizedType,
} from '@netcracker/qubership-apihub-api-unifier'
import { stringify, parse } from 'flatted'

export const isObject = (value: unknown): value is Record<string | symbol, unknown> => {
  return typeof value === 'object' && value !== null
}

export const isArray = (value: unknown): value is Array<unknown> => {
  return Array.isArray(value)
}

export const isNotEmptyArray = (value: unknown): boolean => {
  return !!(Array.isArray(value) && value.length)
}

export const isEmptyArray = (value: unknown): boolean => {
  return (Array.isArray(value) && !value.length)
}

export const isExist = (value: unknown): boolean => {
  return typeof value !== 'undefined'
}

export const isString = (value: unknown): value is string => {
  return typeof value === 'string'
}

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean'
}

export const isSymbol = (value: unknown): value is symbol => {
  return typeof value === 'symbol'
}

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' || isString(value) && !Number.isNaN(+value)
}

// eslint-disable-next-line @typescript-eslint/ban-types
export const isFunc = (value: unknown): value is Function => {
  return typeof value === 'function'
}

export const typeOf = (value: unknown): string => {
  if (Array.isArray(value)) {
    return 'array'
  }
  return value === null ? 'null' : typeof value
}

export const objectKeys = <T extends NonNullable<unknown>>(value: T): (keyof T)[] => {
  return Object.keys(value) as (keyof T)[]
}

export const getKeyValue = (obj: unknown, ...path: JsonPath): unknown | undefined => {
  let value: unknown = obj
  for (const key of path) {
    if (!isSymbol(key) && Array.isArray(value) && typeof +key === 'number' && value.length < +key) {
      value = value[+key]
    } else if (isObject(value) && key in value) {
      value = value[key]
    } else {
      return
    }
    if (value === undefined) { return }
  }
  return value
}

export const getStringValue = (obj: unknown, ...path: JsonPath): string | undefined => {
  const value = getKeyValue(obj, ...path)
  return typeof value === 'string' ? value : undefined
}

export const getObjectValue = (obj: unknown, ...path: JsonPath): Record<string | number, unknown> | undefined => {
  const value = getKeyValue(obj, ...path)
  return isObject(value) ? value : undefined
}

export const getArrayValue = (obj: unknown, ...path: JsonPath): Array<unknown> | undefined => {
  const value = getKeyValue(obj, ...path)
  return Array.isArray(value) ? value : undefined
}

const JSON_SCHEMA_ASSIGN_TYPE_MAPPING: Record<JsonSchemaNodesNormalizedType, Set<JsonSchemaNodesNormalizedType>> = {
  [JSON_SCHEMA_NODE_TYPE_BOOLEAN]: new Set([JSON_SCHEMA_NODE_TYPE_BOOLEAN, JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_TYPE_OBJECT]: new Set([JSON_SCHEMA_NODE_TYPE_OBJECT, JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_TYPE_ARRAY]: new Set([JSON_SCHEMA_NODE_TYPE_ARRAY, JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_TYPE_NUMBER]: new Set([JSON_SCHEMA_NODE_TYPE_NUMBER, JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_TYPE_STRING]: new Set([JSON_SCHEMA_NODE_TYPE_STRING, JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_TYPE_INTEGER]: new Set([JSON_SCHEMA_NODE_TYPE_INTEGER, JSON_SCHEMA_NODE_TYPE_NUMBER, JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_TYPE_NULL]: new Set([JSON_SCHEMA_NODE_TYPE_NULL]),
  [JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]: new Set([JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING]: new Set([
      JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
      JSON_SCHEMA_NODE_TYPE_BOOLEAN,
      JSON_SCHEMA_NODE_TYPE_OBJECT,
      JSON_SCHEMA_NODE_TYPE_ARRAY,
      JSON_SCHEMA_NODE_TYPE_NUMBER,
      JSON_SCHEMA_NODE_TYPE_STRING,
      JSON_SCHEMA_NODE_TYPE_INTEGER,
      JSON_SCHEMA_NODE_TYPE_NULL,
      JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
    ],
  ),
}

export const isTypeAssignable = (
  fromType: unknown | JsonSchemaNodesNormalizedType,
  toType: unknown | JsonSchemaNodesNormalizedType,
  covariant: boolean,
): boolean => {
  if (toType === JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING) {
    return false
  }
  if (fromType === JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING) {
    return true
  }
  const from = (!covariant ? fromType : toType) as JsonSchemaNodesNormalizedType
  const to = (!covariant ? toType : fromType) as JsonSchemaNodesNormalizedType
  const allowedTypes = JSON_SCHEMA_ASSIGN_TYPE_MAPPING[from]
  if (!allowedTypes) {
    return false
  }
  return allowedTypes.has(to)
}

export const nonBreakingIf = (v: boolean): DiffType => (v ? nonBreaking : breaking)

export const isDiffAdd = (diff: Diff): diff is DiffAdd => diff.action === DiffAction.add
export const isDiffRemove = (diff: Diff): diff is DiffRemove => diff.action === DiffAction.remove
export const isDiffRename = (diff: Diff): diff is DiffRename => diff.action === DiffAction.rename
export const isDiffReplace = (diff: Diff): diff is DiffReplace => diff.action === DiffAction.replace

export const onlyExistedArrayIndexes = (array: unknown[]) => anyArrayKeys(array).flatMap(value => (typeof value === 'number' ? [value] : []))

const resolveNodeContextFromCompareContext = (diff: Diff, ctx: CompareContext): NodeContext => {
  return isDiffRemove(diff) ? ctx.before : ctx.after
}

export const resolveCurrentNode = (diff: Diff, ctx: CompareContext) => {
  const context = resolveNodeContextFromCompareContext(diff, ctx)
  const parent = strictResolveValueFromContext(context)
  if (!isObject(parent)) {
    return undefined
  }
  return parent
}

export const resolveParentNode = (diff: Diff, ctx: CompareContext) => {
  const context = resolveNodeContextFromCompareContext(diff, ctx)
  const parent = strictResolveValueFromContext(context, PARENT_JUMP)
  if (!isObject(parent)) {
    return undefined
  }
  return parent
}

export const resolveValueFromCompareContext = (diff: Diff, ctx: CompareContext, ...path: JsonPath) => {
  const context = resolveNodeContextFromCompareContext(diff, ctx)
  const parent = strictResolveValueFromContext(context, ...path)
  if (!isObject(parent)) {
    return undefined
  }
  return parent
}

export const resolveAllDeclarationPath = (diff: Diff): JsonPath[] => {
  let declarationPaths
  switch (diff.action) {
    case DiffAction.add:
      declarationPaths = [...diff.afterDeclarationPaths]
      break
    case DiffAction.remove:
      declarationPaths = [...diff.beforeDeclarationPaths]
      break
    case DiffAction.replace:
      declarationPaths = [...diff.beforeDeclarationPaths, ...diff.afterDeclarationPaths]
      break
    case DiffAction.rename:
      declarationPaths = [...diff.beforeDeclarationPaths, ...diff.afterDeclarationPaths]
      break
  }
  return declarationPaths
}

export const calculateParentJumpDeep = (deep: number): string[] => {
  return [...Array(deep)].fill(PARENT_JUMP)
}

export const checkPrimitiveType = (value: unknown): PrimitiveType | undefined => {
  if (isObject(value)) {
    return undefined
  }
  if (isString(value) || isBoolean(value) || isNumber(value)) {
    return value
  }
  return undefined
}

// This is just a PoC to serialize/deserialize the merged document.
// Merged document is a JSON object with cycles and symbol keys.
// Symbol key could be both in object and array.
// flatted.stringify doesn't serialize custom properties on arrays
// flatted.parse doesn't deserialize custom properties on arrays
// lodash cloneDeepWith does not copy custom properties on arrays
// Approximate times:
// - OAS large x6: Diff: 57914.54ms, Serialize: 488.82ms, Deserialize: 1057.61ms
// - GQL1: Diff: 25495.87ms, Serialize: 255.23ms, Deserialize: 477.04ms
// - GQL2: Diff: 16599.96ms, Serialize: 341.62ms, Deserialize: 527.20ms
// - Shopify (GQL): Diff: 21453.64ms, Serialize: 186.46ms, Deserialize: 371.04ms
/**
 * Serializes an object with cycles and symbol substitution to a string
 * @param obj - The object to serialize (can contain cycles and Symbol keys)
 * @param symbolToStringMapping - Mapping from Symbol keys to string keys
 * @returns Serialized string representation
 */
export const serialize = (obj: unknown, symbolToStringMapping: Map<symbol, string>): string => {
  
  // Walk the object and replace symbol keys, handling cycles
  const visited = new WeakSet()
  
  const replaceSymbolKeys = (object: any): any => {
    // Handle cycles by tracking visited objects
    if (isObject(object) && visited.has(object)) {
      return object
    }
    
    if (isObject(object)) {
      visited.add(object)
      
      // Process symbol keys for both arrays and objects
      const symbolKeys = Object.getOwnPropertySymbols(object)
      let hasSymbolKeys = false
      for (const symbolKey of symbolKeys) {
        const stringKey = symbolToStringMapping.get(symbolKey)
        if (stringKey) {
          // Move value from symbol key to string key
          object[stringKey] = replaceSymbolKeys(object[symbolKey])
          delete object[symbolKey]
          hasSymbolKeys = true
        }
      }
      
      if (isArray(object)) {
        // If array has symbol keys converted to string keys, we need to convert it to a plain object
        // because flatted.stringify doesn't serialize custom properties on arrays
        if (hasSymbolKeys) {
          const arrayAsObject: any = { __isArray: true }
          // Copy array elements
          for (let i = 0; i < object.length; i++) {
            arrayAsObject[i] = replaceSymbolKeys(object[i])
          }
          // Copy any additional string properties (converted from symbols)
          for (const [key, value] of Object.entries(object)) {
            if (!(/^\d+$/.test(key))) { // Skip numeric indices
              arrayAsObject[key] = replaceSymbolKeys(value)
            }
          }
          arrayAsObject.length = object.length
          return arrayAsObject
        } else {
          // Process array elements normally
          for (let i = 0; i < object.length; i++) {
            object[i] = replaceSymbolKeys(object[i])
          }
        }
      } else {
        // Process regular properties for objects
        for (const [key, objValue] of Object.entries(object)) {
          object[key] = replaceSymbolKeys(objValue)
        }
      }
    }
    
    return object
  }
  
  const processedObj = replaceSymbolKeys(obj)
  return stringify(processedObj)
}

/**
 * Deserializes a string back to an object with symbol key restoration
 * @param str - The serialized string
 * @param stringToSymbolMapping - Mapping from string keys to Symbol keys
 * @returns Deserialized object with Symbol keys restored
 */
export const deserialize = (str: string, stringToSymbolMapping: Map<string, symbol>): unknown => {
  // First, parse the string using flatted
  const parsedObj = parse(str)
  
  // Then walk the parsed object and replace string keys with symbol keys, handling cycles
  const visited = new WeakSet()
  
  const replaceStringKeys = (value: any): any => {
    // Handle cycles by tracking visited objects
    if (isObject(value) && visited.has(value)) {
      return value
    }
    
    if (isObject(value)) {
      visited.add(value)
      
      // Check if this is a serialized array (converted to object during serialization)
      if (value.__isArray === true) {
        const arr: any[] = new Array(value.length || 0)
        
        // Restore array elements
        for (let i = 0; i < arr.length; i++) {
          if (i in value) {
            arr[i] = replaceStringKeys(value[i])
          }
        }
        
        // Restore additional properties (including converted symbol keys)
        for (const [key, objValue] of Object.entries(value)) {
          if (key !== '__isArray' && key !== 'length' && !(/^\d+$/.test(key))) {
            const symbolKey = stringToSymbolMapping.get(key)
            if (symbolKey) {
              (arr as any)[symbolKey] = replaceStringKeys(objValue)
            } else {
              (arr as any)[key] = replaceStringKeys(objValue)
            }
          }
        }
        
        return arr
      }
      
      // Process string keys that should be converted to symbol keys for both arrays and objects
      const keysToReplace: Array<[string, symbol]> = []
      
      // First, identify which keys need to be replaced
      for (const key of Object.keys(value)) {
        const symbolKey = stringToSymbolMapping.get(key)
        if (symbolKey) {
          keysToReplace.push([key, symbolKey])
        }
      }
      
      // Replace string keys with symbol keys
      for (const [stringKey, symbolKey] of keysToReplace) {
        value[symbolKey] = replaceStringKeys(value[stringKey])
        delete value[stringKey]
      }
      
      if (isArray(value)) {
        // Process array elements
        for (let i = 0; i < value.length; i++) {
          value[i] = replaceStringKeys(value[i])
        }
      } else {
        // Process remaining properties for objects
        for (const [key, objValue] of Object.entries(value)) {
          value[key] = replaceStringKeys(objValue)
        }
      }
    }
    
    return value
  }
  
  return replaceStringKeys(parsedObj)
}
