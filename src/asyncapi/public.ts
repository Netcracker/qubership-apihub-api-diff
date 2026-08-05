/**
 * The AsyncAPI semantic entity mapping toolkit, as consumed from outside this package.
 *
 * Re-exported from `src/index.ts` under the `asyncApi` namespace, so a call site reads
 * `asyncApi.payloadIdentity(...)` and the scope is visible without looking anything up. Some of
 * these are mechanically generic - `pairLeftoversByIdentity` pairs any two identity maps, and
 * `compareSemanticTieBreak` orders any `PropertyKey` - but nothing outside AsyncAPI produces the
 * identities they operate on, so they stay here. Promote one to a top-level export when a second
 * spec type actually needs it, not before.
 *
 * Deliberately narrow: this module must not re-export `logicalIndexOf`, `withSemanticMapping` or
 * the rule wiring. Those take api-diff-internal shapes (a `CompareContext`, a normalized root) and
 * would freeze internals into the published surface. It must also not name an `@asyncapi/parser`
 * type in any signature - see `asyncapi3.spec-guards.ts`.
 */

export { formatSemanticIdentity, payloadIdentity } from './asyncapi3.identity'
export { compareSemanticTieBreak, pairLeftoversByIdentity } from './asyncapi3.mapping'
export type { LeftoverPairing } from './asyncapi3.mapping'
export type { SemanticIdentity } from './asyncapi3.types'
