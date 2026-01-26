import { runCommonResponseSchemaTests } from './templates/response-schema'
import { runCommonResponseSchema31Tests } from './templates/response-schema31'
import { runAddRemoveDefaultValuesSchemaTests } from './templates/schema'

const SUITE_ID = 'response-body-schema'

const RESPONSE_SCHEMA_PATH = [
  'paths',
  '/path1',
  'post',
  'responses',
  '200',
  'content',
  'application/json',
  'schema',
]

describe('Openapi3 ResponseBody.Schema', () => {
  runCommonResponseSchemaTests(SUITE_ID, RESPONSE_SCHEMA_PATH)
  runAddRemoveDefaultValuesSchemaTests(SUITE_ID)
})

describe('Openapi31 ResponseBody.Schema', () => {
  runCommonResponseSchema31Tests(SUITE_ID, RESPONSE_SCHEMA_PATH)
})
