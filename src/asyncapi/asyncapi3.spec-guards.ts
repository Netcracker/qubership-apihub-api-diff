import type { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'

import { isObject, isString } from '../utils'

/**
 * Narrowing guards onto `@asyncapi/parser`'s `v3` spec types.
 *
 * **Internal on purpose - do not re-export from `src/asyncapi/index.ts`.** A guard's type
 * predicate names a parser type, so exporting one puts an `import … from '@asyncapi/parser'` into
 * a published declaration file. The parser is only a devDependency here, and pinning consumers to
 * api-diff's parser version is exactly what the public surface must avoid. Used in implementation
 * positions only, the import is erased from the emitted `.d.ts`.
 */

/**
 * The `$ref` arm the v3 spec types carry on almost every container. It is statically impossible on
 * a normalized document - normalization inlines every `$ref` - but the compiler cannot know that,
 * so the guards below check for it rather than casting it away.
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
