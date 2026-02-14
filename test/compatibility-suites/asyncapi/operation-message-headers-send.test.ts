import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralRequestLikeSchemaTests } from '../schema/general/request-like'

const SUITE_ID = 'operation-message-headers-send'

const MESSAGE_HEADERS_PATH = [
  'channels',
  'requestChannel',
  'messages',
  'requestMessage',
  'headers',
  'properties',
  'header1',
]

describe('AsyncAPI Operation Message Headers (send)', () => {
  runGeneralRequestLikeSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, MESSAGE_HEADERS_PATH)
})
