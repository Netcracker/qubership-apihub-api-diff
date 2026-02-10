import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralRequestLikeSchemaTests } from '../schema/general/request-like'

const SUITE_ID = 'operation-reply-object-message-headers'

const REPLY_MESSAGE_HEADERS_PATH = [
  'channels',
  'replyChannel',
  'messages',
  'replyMessage',
  'headers',
  'properties',
  'header1',
]

describe('AsyncAPI Operation Reply Object Message Headers', () => {
  runGeneralRequestLikeSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, REPLY_MESSAGE_HEADERS_PATH)
})
