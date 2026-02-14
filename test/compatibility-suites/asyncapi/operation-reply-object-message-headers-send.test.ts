import { TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { runGeneralResponseLikeSchemaTests } from '../schema/general/response-like'

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
  runGeneralResponseLikeSchemaTests(TEST_SPEC_TYPE_ASYNC_API, SUITE_ID, REPLY_MESSAGE_HEADERS_PATH)
})
