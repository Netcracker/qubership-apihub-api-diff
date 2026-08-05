import { CompareMode, type StrictCompareOptions } from '../types'
import { SPEC_TYPE_ASYNCAPI_3 } from '@netcracker/qubership-apihub-api-unifier'

export type AsyncApi3RulesOptions = {
  version: typeof SPEC_TYPE_ASYNCAPI_3
  mode: CompareMode
  firstReferenceKeyProperty?: symbol
  /** See `CompareOptions.asyncApiSemanticEntityMapping`. Defaults to `true` when absent. */
  asyncApiSemanticEntityMapping?: boolean
}


export type AsyncApiCompareOptions = StrictCompareOptions & Omit<AsyncApi3RulesOptions, 'version' | 'firstReferenceKeyProperty'>

/**
 * The semantic identity of an AsyncAPI entity: what a consumer can actually observe -
 * `action` x channel `address` x payload declaration path - as opposed to the generated
 * `operationId` / `channelId` / `messageId` the entity happens to be keyed by.
 *
 * Branded so an identity can never be passed where a key, address or declaration path is
 * expected. The brand is for in-process computation only: it does not survive storage or a
 * JSON response, so persisted and wire-facing types declare a plain `string`.
 *
 * This module deliberately imports no `@asyncapi/parser` type - it is reachable from the public
 * entry point, and a parser reference here would land in a published declaration file. The
 * spec-type guards live in `asyncapi3.spec-guards.ts` for that reason.
 */
export type SemanticIdentity = string & { readonly __semanticIdentity: unique symbol }
