import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralResponseLikeSchemaTests } from '../schema/general/response-like'

const SUITE_ID = 'operation-message-headers-receive'

const MESSAGE_HEADERS_PATH = [
  'channels',
  'requestChannel',
  'messages',
  'requestMessage',
  'headers',
  'properties',
  'header1',
]

describe('AsyncAPI Operation Message Headers (receive)', () => {
  runGeneralResponseLikeSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, MESSAGE_HEADERS_PATH)
})
