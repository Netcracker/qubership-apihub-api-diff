import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import {
  Jso,
  pathItemToFullPath,
  resolveOrigins,
  resolveOriginsMetaRecord,
} from '@netcracker/qubership-apihub-api-unifier'

import { isArray, isObject, isString } from '../utils'
import {
  isAsyncApiChannelObject,
  isAsyncApiMessageObject,
  isAsyncApiOperationObject,
} from './asyncapi3.spec-guards'
import { SemanticIdentity } from './asyncapi3.types'

/**
 * Segment separator for a composite identity: `send|order-events|components/schemas/OrderEvent`.
 *
 * Injectivity does not rest on the character being impossible - `formatSemanticIdentity` throws on
 * a segment containing it - so the only thing this choice decides is how likely a real document
 * trips that throw. A pipe is effectively never seen in the three segment kinds: `action` is
 * `send`/`receive`, an `address` is a topic or routing key (Kafka permits only `[A-Za-z0-9._-]`,
 * AMQP uses `.`/`*`/`#`, MQTT uses `/`/`+`/`#`), and the payload segment is a `components/schemas`
 * path derived from a source type name.
 *
 * Deliberately printable. A control character would be marginally less likely still, but it makes
 * every file and log carrying an identity read as binary - the very problem it would be solving.
 *
 * A single-segment identity never has a separator inserted, so `payloadIdentity`'s result stays the
 * bare readable declaration path (D15).
 */
const SEMANTIC_IDENTITY_SEPARATOR = '|'

/**
 * A payload identity is only sound when it anchors on a *reusable schema declaration*: names
 * under `components/schemas` derive from the source type, so the generator never hashes them.
 * Every other declaration site is rejected - see `payloadIdentity`.
 */
const SCHEMA_DECLARATION_PREFIX = ['components', 'schemas'] as const

/** `components` + `schemas` + the schema's own name. */
const MIN_SCHEMA_DECLARATION_PATH_LENGTH = SCHEMA_DECLARATION_PREFIX.length + 1

const DECLARATION_PATH_SEPARATOR = '/'

const isSchemaDeclarationPath = (path: JsonPath): boolean =>
  path.length >= MIN_SCHEMA_DECLARATION_PATH_LENGTH &&
  SCHEMA_DECLARATION_PREFIX.every((segment, index) => path[index] === segment)

/**
 * Serializes the parts of an identity. Every producer must go through this function so identities
 * built in different places agree byte for byte.
 *
 * Throws if a segment contains the separator: that would make the identity ambiguous, and silently
 * producing a colliding identity is worse than failing loudly on input this exotic.
 */
export const formatSemanticIdentity = (segments: readonly string[]): SemanticIdentity => {
  for (const segment of segments) {
    if (segment.includes(SEMANTIC_IDENTITY_SEPARATOR)) {
      throw new Error(`Semantic identity segment must not contain the separator: ${JSON.stringify(segment)}`)
    }
  }
  return segments.join(SEMANTIC_IDENTITY_SEPARATOR) as SemanticIdentity
}

/**
 * The identity of a message's payload: the declaration path the payload schema is declared at,
 * e.g. `components/schemas/OrderEvent`. Derived from origins, because that is the only place the
 * declaration site survives once normalization has inlined every `$ref`.
 *
 * Deliberately *not* the payload's content: a message whose payload also changed is precisely the
 * case where a match matters most, and content equality would refuse it.
 *
 * Returns `undefined` when the payload has origins but none resolve to a `components/schemas/...`
 * declaration path. An inline payload declares under `components/messages/<id>/payload`, which
 * carries the very id we are trying to look past; a payload contributed by a message trait
 * declares under that shared trait, which would pair unrelated messages; and a defaults-only
 * payload declares under the synthetic defaults origin. Those entities keep the plain add/remove
 * behaviour.
 *
 * **Throws** when the payload carries no origins record at all under `originsFlag`: that is a
 * programming error - a wrong symbol, or a document that was never normalized - not a data
 * condition, and collapsing it into `undefined` would make it indistinguishable from an inline
 * payload, i.e. a silent degradation that looks like normal operation. The check is on the
 * payload rather than on the message because a message with no payload has no payload identity
 * by definition, which is a data condition and must not throw.
 *
 * `message` is typed structurally, so no `@asyncapi/parser` type appears in an exported
 * signature. It is `object` rather than api-unifier's `Jso` because `Jso` is index-signature
 * based and a TypeScript interface never satisfies an index signature - a caller holding an
 * `AsyncAPIV3.MessageObject` could not pass it without a cast. Narrowing happens here instead.
 */
export const payloadIdentity = (message: object, originsFlag: symbol): SemanticIdentity | undefined => {
  const payload = isObject(message) ? message.payload : undefined
  if (!isObject(payload)) {
    return undefined
  }
  if (!resolveOriginsMetaRecord(payload as Jso, originsFlag)) {
    throw new Error('Cannot derive a payload identity: the payload carries no origins record. ' +
      'Pass the same originsFlag the document was normalized with.')
  }
  for (const key of Object.keys(payload)) {
    const origins = resolveOrigins(payload, key, originsFlag)
    if (!origins) {
      continue
    }
    for (const origin of origins) {
      const fullPath = pathItemToFullPath(origin)
      // Only a plain property declaration reveals its container's path, and it does so by ending
      // with the property's own key. A synthesized value points at whatever produced it instead -
      // a synthetic title, for one, origins to the schema node rather than to a `title` property -
      // so dropping the last segment there would climb one level too far.
      if (fullPath[fullPath.length - 1] !== key) {
        continue
      }
      const declarationPath = fullPath.slice(0, -1)
      if (!isSchemaDeclarationPath(declarationPath)) {
        continue
      }
      return formatSemanticIdentity([declarationPath.join(DECLARATION_PATH_SEPARATOR)])
    }
  }
  return undefined
}

/**
 * Semantic identities for the entities of one normalized document.
 *
 * Every entity kind returns `undefined` when it cannot be characterized - no address, no action,
 * or a message whose payload has no stable declaration path. `undefined` disables semantic
 * matching for that entity, which leaves it with the plain add/remove behaviour: strictly safer
 * than pairing on a partial identity.
 */
export interface AsyncApiLogicalIndex {
  /** `action` x channel address x the sorted payload identities of the operation's messages. */
  identityOfOperation(operation: object): SemanticIdentity | undefined

  /**
   * Channel address x the sorted payload identities of the channel's messages. The address alone
   * is not enough - a generator emits several channels on one address, differing only by text.
   */
  identityOfChannel(channel: object): SemanticIdentity | undefined

  /**
   * For a message reached through `components/messages`, where the surrounding action and address
   * are not available locally: the sorted set of `(action, address)` pairs of every operation that
   * references it, plus its payload identity.
   */
  identityOfMessage(message: object): SemanticIdentity | undefined

  /**
   * The message's payload identity alone. Enough inside one channel or one operation, where the
   * action and address are already fixed by the parent.
   */
  payloadIdentityOf(message: object): SemanticIdentity | undefined

  /**
   * The payload identity of a message inside an `operation.reply`, but only when that reply names
   * a concrete channel with an address. A reply with no such channel has no anchor at all - a
   * `reply.address` runtime expression is not one, and the parent operation's own address is the
   * wrong one - so it keeps the plain add/remove behaviour.
   *
   * The anchor cannot be read off the message node, so it is resolved here during the walk.
   */
  replyPayloadIdentityOf(message: object): SemanticIdentity | undefined
}

/** UTF-16 code unit ordering - deliberately not `localeCompare`, which is locale-dependent. */
const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

interface OperationContext {
  readonly action: string
  readonly address: string
}

const compareOperationContexts = (a: OperationContext, b: OperationContext): number =>
  compareStrings(a.action, b.action) || compareStrings(a.address, b.address)

const objectValuesOf = (container: unknown, key: string): unknown[] => {
  if (!isObject(container)) { return [] }
  const map = container[key]
  return isObject(map) && !isArray(map) ? Object.values(map) : []
}

const arrayValuesOf = (container: unknown, key: string): unknown[] => {
  if (!isObject(container)) { return [] }
  const array = container[key]
  return isArray(array) ? array : []
}

const addressOf = (channel: unknown): string | undefined => {
  return isAsyncApiChannelObject(channel) && isString(channel.address) ? channel.address : undefined
}

const buildLogicalIndex = (root: unknown, originsFlag: symbol): AsyncApiLogicalIndex => {
  // A message is reachable from several paths but is one object instance after normalization, so
  // caching by object identity also collapses the repeated work.
  const payloadIdentities = new Map<object, SemanticIdentity | undefined>()
  const payloadIdentityOf = (message: object): SemanticIdentity | undefined => {
    if (!isAsyncApiMessageObject(message)) { return undefined }
    if (payloadIdentities.has(message)) { return payloadIdentities.get(message) }
    const identity = payloadIdentity(message, originsFlag)
    payloadIdentities.set(message, identity)
    return identity
  }

  /**
   * All-or-nothing on purpose: one message we cannot characterize makes the whole container's
   * message set unknown, and pairing containers on a partial set could match two channels that
   * merely share an address and one message.
   */
  const payloadIdentitiesOf = (messages: readonly unknown[]): SemanticIdentity[] | undefined => {
    const identities: SemanticIdentity[] = []
    for (const message of messages) {
      if (!isAsyncApiMessageObject(message)) { return undefined }
      const identity = payloadIdentityOf(message)
      if (identity === undefined) { return undefined }
      identities.push(identity)
    }
    return identities.sort(compareStrings)
  }

  const identityOfOperation = (operation: object): SemanticIdentity | undefined => {
    if (!isAsyncApiOperationObject(operation)) { return undefined }
    // `action` and `channel` are non-optional in the spec types, but api-diff also compares
    // intentionally invalid and partial documents - check at runtime, never trust required-ness.
    const action = isString(operation.action) ? operation.action : undefined
    const address = addressOf(operation.channel)
    if (action === undefined || address === undefined) { return undefined }
    const payloads = payloadIdentitiesOf(arrayValuesOf(operation, 'messages'))
    if (payloads === undefined) { return undefined }
    return formatSemanticIdentity([action, address, ...payloads])
  }

  const identityOfChannel = (channel: object): SemanticIdentity | undefined => {
    const address = addressOf(channel)
    if (address === undefined) { return undefined }
    const payloads = payloadIdentitiesOf(objectValuesOf(channel, 'messages'))
    if (payloads === undefined) { return undefined }
    return formatSemanticIdentity([address, ...payloads])
  }

  // message -> the (action, address) pairs of every operation referencing it. Built by one walk
  // over `operations`, which works by object identity because normalization makes every reference
  // resolve to the same instance.
  const operationContexts = new Map<object, OperationContext[]>()
  // The reply messages that do have a concrete reply-channel address behind them.
  const anchoredReplyMessages = new Set<object>()

  const registerReply = (reply: unknown): void => {
    if (!isObject(reply) || addressOf(reply.channel) === undefined) { return }
    for (const message of arrayValuesOf(reply, 'messages')) {
      if (isAsyncApiMessageObject(message)) { anchoredReplyMessages.add(message) }
    }
  }

  for (const operation of objectValuesOf(root, 'operations')) {
    if (!isAsyncApiOperationObject(operation)) { continue }
    registerReply(operation.reply)
    const action = isString(operation.action) ? operation.action : undefined
    const address = addressOf(operation.channel)
    if (action === undefined || address === undefined) { continue }
    for (const message of arrayValuesOf(operation, 'messages')) {
      if (!isAsyncApiMessageObject(message)) { continue }
      const contexts = operationContexts.get(message)
      if (contexts) {
        contexts.push({ action, address })
      } else {
        operationContexts.set(message, [{ action, address }])
      }
    }
  }

  // The reply rules are shared between `operations/*/reply` and `components/replies/*`, so a reply
  // reachable only through components has to be registered too.
  const components = isObject(root) ? root.components : undefined
  for (const reply of objectValuesOf(components, 'replies')) {
    registerReply(reply)
  }

  const replyPayloadIdentityOf = (message: object): SemanticIdentity | undefined => {
    return anchoredReplyMessages.has(message) ? payloadIdentityOf(message) : undefined
  }

  const identityOfMessage = (message: object): SemanticIdentity | undefined => {
    const payload = payloadIdentityOf(message)
    if (payload === undefined) { return undefined }
    // Sorted so a message referenced by several operations still gets a deterministic identity.
    const contexts = [...operationContexts.get(message) ?? []].sort(compareOperationContexts)
    return formatSemanticIdentity([...contexts.flatMap(({ action, address }) => [action, address]), payload])
  }

  return {
    identityOfOperation,
    identityOfChannel,
    identityOfMessage,
    payloadIdentityOf,
    replyPayloadIdentityOf,
  }
}

interface MemoizedLogicalIndex {
  readonly originsFlag: symbol
  readonly index: AsyncApiLogicalIndex
}

const logicalIndexCache = new WeakMap<object, MemoizedLogicalIndex>()

/**
 * The index for a normalized document root, memoized per root so the walk happens at most once
 * per document however many mapping resolvers ask for it. `root` is `NodeContext['root']`, hence
 * `unknown`; a non-object root yields an index that answers `undefined` to everything.
 */
export const logicalIndexOf = (root: unknown, originsFlag: symbol): AsyncApiLogicalIndex => {
  if (!isObject(root)) {
    return buildLogicalIndex(root, originsFlag)
  }
  const memoized = logicalIndexCache.get(root)
  // The flag is part of what the index computed, so a different one has to rebuild rather than
  // silently answer with identities derived from another document's origins.
  if (memoized && memoized.originsFlag === originsFlag) {
    return memoized.index
  }
  const index = buildLogicalIndex(root, originsFlag)
  logicalIndexCache.set(root, { originsFlag, index })
  return index
}
