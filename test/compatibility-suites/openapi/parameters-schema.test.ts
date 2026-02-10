import { TEST_SPEC_TYPE_OPEN_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralRequestLikeSchemaTests } from '../schema/general/request-like'
import { runOpenApiOnlyRequestLikeSchemaTests } from '../schema/openapi-only/request-like'

const SUITE_ID = 'parameters-schema'

const PARAMETERS_SCHEMA_PATH = [
  'paths',
  '/path1',
  'post',
  'parameters',
  0,
  'schema',
]

describe('Parameters Schema', () => {
  runGeneralRequestLikeSchemaTests(TEST_SPEC_TYPE_OPEN_API, SUITE_ID, PARAMETERS_SCHEMA_PATH)
  runOpenApiOnlyRequestLikeSchemaTests(TEST_SPEC_TYPE_OPEN_API, SUITE_ID, PARAMETERS_SCHEMA_PATH)
})
