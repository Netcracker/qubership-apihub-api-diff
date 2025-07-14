import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG } from './helper'
import { CompareOptions } from '../src/types'
import { apiDiff } from '../src/api'
import { DiffAction, unclassified } from '../src/core/constants'
import { diffsMatcher } from './helper/matchers'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import base from './helper/resources/openapi-specification-extensions/base.json'

const OPTIONS: CompareOptions = {  
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  validate: true,
  unify: true,
  liftCombiners: true,
  allowNotValidSyntheticChanges: true,
}

// Helper function to deep clone an object using JSON serialization
function clone(obj: any): any {
  return JSON.parse(JSON.stringify(obj))
}

// Helper function to set a value at a specific path in an object
// creates a new object or array if some parts of the path are missing
function setValueAtPath(obj: any, path: JsonPath, value: any): void {  
  if (path.length === 0) return
  
  let current = obj
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    const nextKey = path[i + 1]
    if (!(key in current)) {
      current[key] = typeof nextKey === 'number' ? [] : {}
    }
    current = current[key]
  }
  if (value !== undefined) {
    current[path[path.length - 1]] = value
  }
}

// Helper function to prepare before and after specifications
function prepareSpecsForComparison(extensionPath: JsonPath, beforeValue?: any, afterValue?: any): { before: any, after: any } {
  const before = clone(base)
  const after = clone(base)
  
  setValueAtPath(before, extensionPath, beforeValue)
  setValueAtPath(after, extensionPath, afterValue)
  
  return { before, after }
}

const serverObjectPaths: JsonPath[] = [
  ['servers', 0],
  ['paths', '/somePath', 'servers', 0],
  ['paths', '/somePath', 'get', 'servers', 0],
]

const operationObjectPaths: JsonPath[] = [
  ['paths', '/somePath', 'get'],
]

const tagObjectPaths: JsonPath[] = [
  ['tags', 0],
]

const responseObjectPaths: JsonPath[] = [
  ['components', 'responses', 'someResponse'],
  ['paths', '/somePath', 'get', 'responses', '200'],
]

const requestBodyObjectPaths: JsonPath[] = [
  ['paths', '/somePath', 'get', 'requestBody'],
  ['components', 'requestBodies', 'someRequestBody'],
]

const parameterObjectPaths: JsonPath[] = [
  ['components', 'parameters', 'someParameter'],
  ['paths', '/somePath', 'parameters', 0],
  ['paths', '/somePath', 'get', 'parameters', 0],
]

const contentEncodingHeaderSuffix = ['content', 'application/json', 'encoding', 'someProperty', 'headers', 'someHeader']

const headerObjectPaths: JsonPath[] = [
  ['components', 'headers', 'someHeader'],
  ['components', 'responses', 'someResponse', 'headers', 'someHeader'],
  ['paths', '/somePath', 'get', 'responses', '200', 'headers', 'someHeader'],
  // 'content' not supported for Parameter Object in classification rules yet
  //...parameterObjectPaths.map(path => [...path, ...contentEncodingHeaderSuffix]),
  ...requestBodyObjectPaths.map(path => [...path, ...contentEncodingHeaderSuffix]), 
  ...responseObjectPaths.map(path => [...path, ...contentEncodingHeaderSuffix])
]

const headerObjectPathsWithRecursionFirstLevel: JsonPath[] = [
  ...headerObjectPaths,
  // 'content' not supported for Header Object in classification rules yet
  // ...headerObjectPaths.map(path => [...path, ...contentEncodingHeaderSuffix])
]

const mediaTypeObjectPaths: JsonPath[] = [
  // 'content' not supported for Parameter Object in classification rules yet
  //...parameterObjectPaths.map(path => [...path, 'content', 'application/json']),
  // 'content' not supported for Header Object in classification rules yet
  //...headerObjectPathsWithRecursionFirstLevel.map(path => [...path, 'content', 'application/json']),
  ...requestBodyObjectPaths.map(path => [...path, 'content', 'application/json']),
  ...responseObjectPaths.map(path => [...path, 'content', 'application/json']),
]

const encodingObjectPaths: JsonPath[] = [
  ...mediaTypeObjectPaths.map(path => [...path, 'encoding', 'someProperty']),
]

const schemaObjectPaths: JsonPath[] = [
  ['components', 'schemas', 'someSchema'],
  ...parameterObjectPaths.map(path => [...path, 'schema']),
  ...headerObjectPaths.map(path => [...path, 'schema']),
  ...mediaTypeObjectPaths.map(path => [...path, 'schema']),
]

const schemaInSchemaPathSuffixes: JsonPath[] = [  
    ['items'],
    ['properties', 'someProperty'],    
    ['allOf', 0],
    ['oneOf', 0],
    ['anyOf', 0],
    ['not'],
    ['definitions', 'someSchema'],
    ['additionalProperties'],
    //['additionalItems'],  // additionalItems not supported (removed) by api-unifier now
    // add addition places for OAS 3.1, like 'patternProperties', $defs, etc.
]

const schemaObjectPathsWithRecursionFirstLevel: JsonPath[] = [
  ...schemaObjectPaths,
  ...schemaObjectPaths.flatMap(basePath => 
    schemaInSchemaPathSuffixes.map(suffix => [...basePath, ...suffix])
  )
]

const externalDocumentationObjectPaths: JsonPath[] = [
  ['externalDocs'],
  ...operationObjectPaths.map(path => [...path, 'externalDocs']),
  ...tagObjectPaths.map(path => [...path, 'externalDocs']), 
  ...schemaObjectPathsWithRecursionFirstLevel.map(path => [...path, 'externalDocs']),
]

const xmlObjectPaths: JsonPath[] = [
  ...schemaObjectPathsWithRecursionFirstLevel.map(path => [...path, 'xml']),
]

const linkObjectPaths: JsonPath[] = [
  // Link Object classification rules are not implemented yet
  //['components', 'links', 'someLink'],
  //...responseObjectPaths.map(path => [...path, 'links', 'someLink']),
]

const callbackObjectPaths: JsonPath[] = [
  // Callback Object classification rules are not implemented yet
  //['components', 'callbacks', 'someCallback'],
  //...operationObjectPaths.map(path => [...path, 'callbacks', 'someCallback']),
]

const pathItemObjectPaths: JsonPath[] = [
  ['paths', '/somePath'],
  ...callbackObjectPaths.map(path => [...path, 'someExpression']),
  // ['components', 'pathItems', 'somePathItem'], // support path items in components for OAS 3.1
]

const securitySchemeObjectPaths: JsonPath[] = [
  ['components', 'securitySchemes', 'oauth2'],
]

const oAuthFlowsObjectPaths: JsonPath[] = [
  ['components', 'securitySchemes', 'oauth2', 'flows'],
]

const oAuthFlowObjectPaths: JsonPath[] = [
  ['components', 'securitySchemes', 'oauth2', 'flows', 'implicit'],
  ['components', 'securitySchemes', 'oauth2', 'flows', 'password'],
  ['components', 'securitySchemes', 'oauth2', 'flows', 'clientCredentials'],
  ['components', 'securitySchemes', 'oauth2', 'flows', 'authorizationCode'],
]

const exampleObjectPaths: JsonPath[] = [
  ['components', 'examples', 'someExample'],
  ...parameterObjectPaths.map(path => [...path, 'examples', 'someExample']),
  ...headerObjectPaths.map(path => [...path, 'examples', 'someExample']),
  ...mediaTypeObjectPaths.map(path => [...path, 'examples', 'someExample']),  
]

// Paths where OpenAPI specification extensions can be added
const specificationExtensionObjectPaths: JsonPath[] = [
  
  // OpenAPI Object
  [],
  
  // Info Object and its nested objects
  ['info'],
  ['info', 'contact'],
  ['info', 'license'],  

  // Components Object
  ['components'],

  // Server Object
  ...serverObjectPaths,

  // Server variables
  ...serverObjectPaths.map(path => [...path, 'variables', 'someVariable']),

  // Paths Object
  // ['paths'], //TODO: fix cases with complex values- they fail now for paths

  // Path Item Object 
  ...pathItemObjectPaths,  

  // Operation Object
  ...operationObjectPaths,

  // External Documentation Object
  ...externalDocumentationObjectPaths,

  // Parameter Object
  ...parameterObjectPaths,

  // Request Body Object
  ...requestBodyObjectPaths,

  // Media Type Object
  ...mediaTypeObjectPaths,

  // Encoding Object
  ...encodingObjectPaths,

  // Responses Object
  ['paths', '/somePath', 'get', 'responses'],

  // Response Object
  ...responseObjectPaths,

  // Callback Object
  //...callbackObjectPaths, 
 
  // Example Object
  ...exampleObjectPaths,

  // Link Object
  ...linkObjectPaths, 

  //Header Object
  ...headerObjectPathsWithRecursionFirstLevel,

  // Tag Object
  ...tagObjectPaths, 

  // Schema Object
  ...schemaObjectPathsWithRecursionFirstLevel,

  // XML Object
  ...xmlObjectPaths,

  // Security Scheme Object
  ...securitySchemeObjectPaths,

  // OAuth Flows Object
  ...oAuthFlowsObjectPaths,

  // OAuth Flow Object
  ...oAuthFlowObjectPaths,  
]

// Common extension name used in all tests
const extensionName = 'x-custom-extension'

describe('OpenAPI specification extensions changes classification', () => {
  
  describe('Template check', () => {  
    it('should not detect any changes in a base specification with no extensions', () => {
      const { before, after } = prepareSpecsForComparison([], undefined, undefined)
      const { diffs } = apiDiff(before, after, OPTIONS)
      expect(diffs).toEqual(diffsMatcher([]))
    })
  })

  //const testPaths: JsonPath[] = [['paths']] // use for debugging specific case
  //testPaths.forEach(path => {
  specificationExtensionObjectPaths.forEach(path => {
    const pathDescription = path.length > 0 ? path.join('.') : '[]'
    const fullExtensionPath = [...path, extensionName]
    
    describe(`Extensions in '${pathDescription}'`, () => {

      const expectedType = unclassified
      
      it(`add specification extension with primitive value`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, undefined, 'primitive value')
        
        const { diffs } = apiDiff(before, after, OPTIONS)
        
        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            afterDeclarationPaths: [fullExtensionPath],            
            action: DiffAction.add,
            type: expectedType,
            afterValue: 'primitive value',
          })
        ]))
      })

      it(`add specification extension with complex value`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, undefined, { key: 'value' })
        
        const { diffs } = apiDiff(before, after, OPTIONS)
        
        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            afterDeclarationPaths: [fullExtensionPath],
            action: DiffAction.add,
            type: expectedType,
            afterValue: { key: 'value' },
          })
        ]))
      })

      it(`remove specification extension with primitive value`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, 'primitive value', undefined)
        
        const { diffs } = apiDiff(before, after, OPTIONS)
        
        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            beforeDeclarationPaths: [fullExtensionPath],
            action: DiffAction.remove,
            type: expectedType,
            beforeValue: 'primitive value',
          })
        ]))
      })

      it(`remove specification extension with complex value`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, { key: 'value' }, undefined)
        
        const { diffs } = apiDiff(before, after, OPTIONS)
        
        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            beforeDeclarationPaths: [fullExtensionPath],
            action: DiffAction.remove,
            type: expectedType,
            beforeValue: { key: 'value' },
          })
        ]))
      })

      it(`change specification extension with primitive value`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, 'original value', 'changed value')
        
        const { diffs } = apiDiff(before, after, OPTIONS)
        
        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            beforeDeclarationPaths: [fullExtensionPath],
            afterDeclarationPaths: [fullExtensionPath],
            action: DiffAction.replace,
            type: expectedType,
            beforeValue: 'original value',
            afterValue: 'changed value',
          })
        ]))
      })

      it(`change complex value of specification extension`, () => {
        const { before, after } = prepareSpecsForComparison(fullExtensionPath, { nested: 'original' }, { nested: 'modified' })
        
        const { diffs } = apiDiff(before, after, OPTIONS)
        
        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            beforeDeclarationPaths: [[...fullExtensionPath, 'nested']],
            afterDeclarationPaths: [[...fullExtensionPath, 'nested']],
            action: DiffAction.replace,
            type: expectedType,
            beforeValue: 'original',
            afterValue: 'modified',
          })
        ]))
      })

      it(`change specification extension from simple to complex value`, () => {
        const { before, after } = prepareSpecsForComparison (fullExtensionPath, 'simple value', { nested: 'modified' })
        
        const { diffs } = apiDiff(before, after, OPTIONS)
        
        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            beforeDeclarationPaths: [fullExtensionPath],
            afterDeclarationPaths: [fullExtensionPath],
            action: DiffAction.replace,
            type: expectedType,
            beforeValue: 'simple value',
            afterValue: { nested: 'modified' },
          })
        ]))
      })      
    })
  })
})
