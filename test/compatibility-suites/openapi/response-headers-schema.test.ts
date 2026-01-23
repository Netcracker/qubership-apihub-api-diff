import { runCommonResponseSchemaTests } from './templates/response-schema'
import { runCommonResponseSchema31Tests } from './templates/response-schema31'
import { runAddRemoveDefaultValuesSchemaTests } from './templates/schema'

const SUITE_ID = 'response-headers-schema'

const RESPONSE_HEADERS_SCHEMA_PATH = [
  'paths',
  '/path1',
  'post',
  'responses',
  '200',
  'headers',
  'X-Header-1',
  'schema',
]

describe('Openapi3 ResponseHeaders.Schema', () => {
  runCommonResponseSchemaTests(SUITE_ID, RESPONSE_HEADERS_SCHEMA_PATH)
  runAddRemoveDefaultValuesSchemaTests(SUITE_ID)
})

describe('Openapi31 ResponseHeaders.Schema', () => {
  runCommonResponseSchema31Tests(SUITE_ID, RESPONSE_HEADERS_SCHEMA_PATH)
})
