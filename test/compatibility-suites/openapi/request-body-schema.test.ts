import { TEST_SPEC_TYPE_OPEN_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralRequestLikeSchemaTests } from '../schema/general/request-like'
import { runOpenApiOnlyRequestLikeSchemaTests } from '../schema/openapi-only/request-like'

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

describe('Request Body Schema', () => {
  runGeneralRequestLikeSchemaTests(TEST_SPEC_TYPE_OPEN_API, SUITE_ID, REQUEST_SCHEMA_PATH)
  runOpenApiOnlyRequestLikeSchemaTests(TEST_SPEC_TYPE_OPEN_API, SUITE_ID, REQUEST_SCHEMA_PATH)
})
