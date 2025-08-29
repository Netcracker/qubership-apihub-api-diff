import { runAddRemoveDefaultValuesSchemaTests, runCommonSchemaTests } from './templates/schema'
import { runCommonSchema31Tests } from './templates/schema31'
import { runSiblingPropertiesSchema } from './templates/sibling-properties-schema.template'

const SUITE_ID = 'request-body-schema'

const REQUEST_SCHEMA_PATH = [
  'paths',
  '/path1',
  'post',
  'requestBody',
  'content',
  'application/json',
  'schema',
]

describe('Openapi3 Request Body Schema', () => {
  runCommonSchemaTests(SUITE_ID, REQUEST_SCHEMA_PATH)

  runAddRemoveDefaultValuesSchemaTests(SUITE_ID)
})

describe('Openapi31 Request Body Schema', () => {
  runCommonSchema31Tests(SUITE_ID, REQUEST_SCHEMA_PATH)
})

describe('Openapi31 Request Body. Sibling properties Schema', () => {
  runSiblingPropertiesSchema(SUITE_ID, REQUEST_SCHEMA_PATH)
})
