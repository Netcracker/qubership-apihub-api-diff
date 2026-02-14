import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralResponseLikeSchemaTests } from '../schema/general/response-like'

const SUITE_ID = 'operation-message-payload-receive'

const MESSAGE_PAYLOAD_PATH = [
  'channels',
  'requestChannel',
  'messages',
  'requestMessage',
  'payload',
]

describe('AsyncAPI Operation Message Payload (receive)', () => {
  runGeneralResponseLikeSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, MESSAGE_PAYLOAD_PATH)
})
