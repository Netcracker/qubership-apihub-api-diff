import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralSchemaTests } from '../schemas/schema-test-runner-general'
import { DATA_FLOW_DIRECTION_RECEIVE } from '../utils'

const SUITE_ID = 'operation-message-payload-receive'

const MESSAGE_PAYLOAD_PATH = [
  'channels',
  'requestChannel',
  'messages',
  'requestMessage',
  'payload',
]

describe('AsyncAPI Operation Message Payload (receive)', () => {
  runGeneralSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, MESSAGE_PAYLOAD_PATH, DATA_FLOW_DIRECTION_RECEIVE)
})
