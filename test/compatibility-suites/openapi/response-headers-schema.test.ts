import { runCommonSchema31Tests } from './templates/schema31'

const SUITE_ID = 'response-headers-schema'

const PATH_TO_PARAMETERS_SCHEMA31 = [
  'paths',
  '/example',
  'get',
  'responses',
  '200',
  'headers',
  'X-Header-1',
  'schema',
]

describe('Openapi31 ResponseHeaders.Schema', () => {
  runCommonSchema31Tests(SUITE_ID, PATH_TO_PARAMETERS_SCHEMA31, true)
})
