import { runRefObjectDescriptionTests } from './templates/reference-object-31.template'

const SUITE_ID = 'headers'
const PATH_TO_HEADER_DESCRIPTION = ['paths', '/path1', 'get', 'responses', '200', 'headers', 'X-Rate-Limit']
const PATH_TO_COMPONENT_DESCRIPTION = ['components', 'headers', 'X-Rate-Limit', 'description']

describe('Reference object. Headers. Description fields in ref object', () => {
  runRefObjectDescriptionTests(SUITE_ID, PATH_TO_HEADER_DESCRIPTION, PATH_TO_COMPONENT_DESCRIPTION)
})
