import { Parser } from '@asyncapi/parser'
import type { Input } from '@asyncapi/parser/esm/types'
import type { v3 } from '@asyncapi/parser/esm/spec-types'
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
