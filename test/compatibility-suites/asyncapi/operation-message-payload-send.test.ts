import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralRequestLikeSchemaTests } from '../schema/general/request-like'

const SUITE_ID = 'operation-message-payload-send'

const MESSAGE_PAYLOAD_PATH = [
  'channels',
  'requestChannel',
  'messages',
  'requestMessage',
  'payload',
]

describe('AsyncAPI Operation Message Payload (send)', () => {
  runGeneralRequestLikeSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, MESSAGE_PAYLOAD_PATH)
})
