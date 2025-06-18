import { runCommonSchemaTests } from './templates/schema'
import { runCommonSchema31Tests } from './templates/schema31'

const SUITE_ID = 'parameters-schema'

const PARAMETERS_SCHEMA_PATH = [
  'paths',
  '/path1',
  'post',
  'parameters',
  0,
  'schema',
]

const PATH_TO_PARAMETERS_SCHEMA31 = [
  'paths',
  '/example',
  'get',
  'parameters',
  0,
  'schema',
]

describe('Openapi3 Parameters Schema', () => {
  runCommonSchemaTests(SUITE_ID, PARAMETERS_SCHEMA_PATH)
})
describe('Openapi31 Parameters Schema', () => {
  runCommonSchema31Tests(SUITE_ID, PATH_TO_PARAMETERS_SCHEMA31)
})
