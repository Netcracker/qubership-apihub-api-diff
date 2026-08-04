import { Parser } from '@asyncapi/parser'
import type { Input } from '@asyncapi/parser/esm/types'
import type { v3 } from '@asyncapi/parser/esm/spec-types'
import {
  getCompatibilitySuite,
  getCompatibilitySuites,
  TEST_SPEC_TYPE_ASYNC_API,
} from '@netcracker/qubership-apihub-compatibility-suites'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'
import 'jest-extended'

const parser = new Parser()

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
  const filteredDiagnostics = diagnostics.filter(
    diagnostic => !(
      diagnostic.code === 'asyncapi-latest-version' &&
      diagnostic.message.includes('The latest version of AsyncAPi is not used')
    ),
  )
  expect(filteredDiagnostics).toBeEmpty()
  const json = document?.json()
  if (json === undefined) {
    throw new Error('Expected document when diagnostics are empty')
  }
  return json as v3.AsyncAPIObject
}

/**
 * Every testId of an AsyncAPI compatibility suite, in a stable order.
 *
 * Enumerating beats a hand-kept list: a case added to the corpus is picked up here without a
 * second edit, and one removed or renamed cannot leave a test silently pointing at nothing.
 *
 * Throws on an empty result, because `it.each([])` registers no tests at all - a suite that
 * vanished (renamed, or a corpus version without it) would otherwise read as "all green".
 */
export function asyncApiSuiteCaseIds(suiteId: string): string[] {
  const testIds = getCompatibilitySuites(TEST_SPEC_TYPE_ASYNC_API).get(suiteId)
  if (!testIds || testIds.length === 0) {
    throw new Error(`No compatibility suite cases found for ${TEST_SPEC_TYPE_ASYNC_API}/${suiteId}`)
  }
  return [...testIds].sort()
}

export interface AsyncApiSuiteCase {
  readonly before: v3.AsyncAPIObject
  readonly after: v3.AsyncAPIObject
}

/**
 * Loads an AsyncAPI case from the shared compatibility corpus and asserts **both** documents are
 * valid AsyncAPI 3.0.0 before handing them back.
 *
 * A corpus sample is a test fixture like any inline literal, so it gets the same validation - and
 * because the corpus lives in a separately versioned package, a fixture can be edited without the
 * consuming test noticing. Loading through here is what keeps that from going unnoticed.
 *
 * Returns the parsed **source** documents (not the parser's own model), which is what api-diff and
 * api-unifier consume.
 */
export async function loadValidAsyncApiSuiteCase(suiteId: string, testId: string): Promise<AsyncApiSuiteCase> {
  const [beforeYaml, afterYaml] = getCompatibilitySuite(TEST_SPEC_TYPE_ASYNC_API, suiteId, testId)
  const before = loadYaml(beforeYaml) as v3.AsyncAPIObject
  const after = loadYaml(afterYaml) as v3.AsyncAPIObject
  await parseAsyncApiAndAssertValid(before)
  await parseAsyncApiAndAssertValid(after)
  return { before, after }
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
