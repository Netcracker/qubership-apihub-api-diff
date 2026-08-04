import type { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { CompareMode, type StrictCompareOptions } from '../types'
import { SPEC_TYPE_ASYNCAPI_3 } from '@netcracker/qubership-apihub-api-unifier'
import { isObject, isString } from '../utils'

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
 */
export type SemanticIdentity = string & { readonly __semanticIdentity: unique symbol }

/**
 * The `$ref` arm the v3 spec types carry on almost every container. It is statically
 * impossible on a normalized document - normalization inlines every `$ref` - but the compiler
 * cannot know that, so the guards below check for it rather than casting it away.
 */
const isAsyncApiReferenceObject = (value: Record<string | symbol, unknown>): boolean => isString(value.$ref)

/*
 * None of the guards below check the fields the spec types mark as required
 * (`OperationObject.action`, `OperationObject.channel`). api-diff also compares intentionally
 * invalid and partial documents, so required-ness in the type is not a runtime guarantee -
 * callers check presence themselves with `isString` / `isObject` at the point of use.
 */

export const isAsyncApiOperationObject = (value: unknown): value is AsyncAPIV3.OperationObject =>
  isObject(value) && !isAsyncApiReferenceObject(value)

export const isAsyncApiChannelObject = (value: unknown): value is AsyncAPIV3.ChannelObject =>
  isObject(value) && !isAsyncApiReferenceObject(value)

export const isAsyncApiMessageObject = (value: unknown): value is AsyncAPIV3.MessageObject =>
  isObject(value) && !isAsyncApiReferenceObject(value)
