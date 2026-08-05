import { Parser } from '@asyncapi/parser'
import type { RulesetOptions } from '@asyncapi/parser/esm/ruleset'
import type { Input } from '@asyncapi/parser/esm/types'
import type { v3 } from '@asyncapi/parser/esm/spec-types'
import { getCompatibilitySuite, TEST_SPEC_TYPE_ASYNC_API } from '@netcracker/qubership-apihub-compatibility-suites'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'
import 'jest-extended'

/**
 * Parser ruleset with one rule intentionally suppressed.
 *
 * asyncapi-latest-version: fires when the document uses AsyncAPI 3.0.0 instead of the newest
 * version known to the parser. Test fixtures pin 3.0.0 on purpose, so this is noise rather than a
 * defect. Turning the rule off beats filtering its output afterwards: a filter also hides the rule
 * firing for a reason we did not anticipate.
 *
 */
const ASYNCAPI_PARSER_RULESET: RulesetOptions = {
  extends: [],
  rules: {
    'asyncapi-latest-version': 'off',
  },
}

const parser = new Parser({ ruleset: ASYNCAPI_PARSER_RULESET })

/**
 * Parses an AsyncAPI spec with the AsyncAPI parser, asserts there are no diagnostics,
 * and returns the parsed document as JSON. Use in tests to ensure the spec is valid
 * and to compare unifier output with parser output.
 *
 * `v3.AsyncAPIObject` is accepted alongside `Input` so fixtures can be written against the
 * parser's own spec types: `Input`'s object arm is `MaybeAsyncAPI` (`{ asyncapi: string } &
 * Record<string, unknown>`), and an interface never satisfies that string index signature,
 * even though the parser handles such a document at runtime.
 */
export async function parseAsyncApiAndAssertValid(spec: Input | v3.AsyncAPIObject): Promise<v3.AsyncAPIObject> {
  const { document, diagnostics } = await parser.parse(spec as Input)
  expect(diagnostics).toBeEmpty()
  const json = document?.json()
  if (json === undefined) {
    throw new Error('Expected document when diagnostics are empty')
  }
  return json as v3.AsyncAPIObject
}

export interface AsyncApiSuiteCase {
  readonly before: v3.AsyncAPIObject
  readonly after: v3.AsyncAPIObject
}

/**
 * Loads an AsyncAPI case from the shared compatibility corpus.
 *
 * The samples are **not** validated here. Validity is the corpus package's own concern and is
 * asserted by its `test/asyncapi-samples.test.ts`, so a malformed sample can never be published -
 * which also spares every consumer re-parsing the whole corpus on every test run. Inline fixtures
 * written in this repository still go through `parseAsyncApiAndAssertValid`.
 */
export function loadAsyncApiSuiteCase(suiteId: string, testId: string): AsyncApiSuiteCase {
  const [beforeYaml, afterYaml] = getCompatibilitySuite(TEST_SPEC_TYPE_ASYNC_API, suiteId, testId)
  return {
    before: loadYaml(beforeYaml) as v3.AsyncAPIObject,
    after: loadYaml(afterYaml) as v3.AsyncAPIObject,
  }
}

/**
 * Narrows away the `| ReferenceObject` arm the v3 spec types carry on almost every container
 * (`ChannelsObject`, `MessagesObject`, `OperationObject['channel']`, ...). On a normalized or
 * merged document every `$ref` is inlined, so that arm is statically impossible - this asserts
 * it rather than casting it away silently, and fails loudly if the tree is not shaped as
 * expected. Also rejects `undefined`, so optional spec fields can be walked without `!`.
 */
export function resolved<T>(value: T | v3.ReferenceObject | undefined): T {
  expect(value).toBeDefined()
  expect(value).not.toHaveProperty('$ref')
  return value as T
}
