import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralResponseLikeSchemaTests } from '../schema/general/response-like'

const SUITE_ID = 'operation-reply-object-message-payload-send'

const REPLY_MESSAGE_PAYLOAD_PATH = [
  'channels',
  'replyChannel',
  'messages',
  'replyMessage',
  'payload',
]

describe('AsyncAPI Operation Reply Object Message Payload (send)', () => {
  runGeneralResponseLikeSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, REPLY_MESSAGE_PAYLOAD_PATH)
})
