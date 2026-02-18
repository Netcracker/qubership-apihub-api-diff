import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralSchemaTests } from '../schemas/schema-test-runner-general'
import { DATA_FLOW_DIRECTION_RECEIVE } from '../utils'

const SUITE_ID = 'operation-reply-object-message-headers-send'

const REPLY_MESSAGE_HEADERS_PATH = [
  'channels',
  'replyChannel',
  'messages',
  'replyMessage',
  'headers',
  'properties',
  'header1',
]

describe('AsyncAPI Operation Reply Object Message Headers (send)', () => {
  runGeneralSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, REPLY_MESSAGE_HEADERS_PATH, DATA_FLOW_DIRECTION_RECEIVE)
})
