import { TEST_SPEC_TYPE_OPEN_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralSchemaTests } from '../schemas/schema-test-runner-general'
import { runOpenApiOnlySchemaTests } from '../schemas/schema-test-runner-openapi-only'
import { SCHEMA_DIFF_DIRECTION } from '../utils'

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

describe('Response Headers Schema', () => {
  runGeneralSchemaTests(TEST_SPEC_TYPE_OPEN_API, SUITE_ID, RESPONSE_HEADERS_SCHEMA_PATH, SCHEMA_DIFF_DIRECTION.response)
  runOpenApiOnlySchemaTests(TEST_SPEC_TYPE_OPEN_API, SUITE_ID, RESPONSE_HEADERS_SCHEMA_PATH, SCHEMA_DIFF_DIRECTION.response)
})
