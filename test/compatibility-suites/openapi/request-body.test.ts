import { runRefObjectDescriptionTests } from './templates/reference-object-31.template'

const SUITE_ID = 'request-body'
const PATH_TO_HEADER_DESCRIPTION = ['paths', '/path1', 'post', 'requestBody', 'description']
const PATH_TO_COMPONENTS_DESCRIPTION = ['components', 'requestBodies', 'rb1', 'description']

describe('Reference object. Request body. Description fields in ref object', () => {
  runRefObjectDescriptionTests(SUITE_ID, PATH_TO_HEADER_DESCRIPTION, PATH_TO_COMPONENTS_DESCRIPTION)
})
