import { TEST_SPEC_TYPE_OPEN_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralResponseLikeSchemaTests } from '../schema/general/response-like'
import { runOpenApiOnlyResponseLikeSchemaTests } from '../schema/openapi-only/response-like'

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

describe('Response Body Schema', () => {
  runGeneralResponseLikeSchemaTests(TEST_SPEC_TYPE_OPEN_API, SUITE_ID, RESPONSE_SCHEMA_PATH)
  runOpenApiOnlyResponseLikeSchemaTests(TEST_SPEC_TYPE_OPEN_API, SUITE_ID, RESPONSE_SCHEMA_PATH)
})
