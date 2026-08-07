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
  for (const declarationPath of declarationPathsOf(payload, originsFlag)) {
    if (!isSchemaDeclarationPath(declarationPath)) {
      continue
    }
    return formatSemanticIdentity([declarationPath.join(DECLARATION_PATH_SEPARATOR)])
  }
  return undefined
}

/**
 * The paths the node itself is declared at, one per own property that carries a plain declaration
 * origin.
 *
 * Only a plain property declaration reveals its container's path, and it does so by ending with
 * the property's own key. A synthesized value points at whatever produced it instead - a synthetic
 * title, for one, origins to the schema node rather than to a `title` property, and a defaulted
 * value origins to the synthetic defaults record - so dropping the last segment there would climb
 * one level too far.
 *
 * A node reached through a `$ref` yields the path of the declaration, not of the reference, which
 * is the whole reason this is derived from origins rather than from the traversal.
 */
const declarationPathsOf = (node: object, originsFlag: symbol): JsonPath[] => {
  const paths: JsonPath[] = []
  for (const key of Object.keys(node)) {
    const origins = resolveOrigins(node as Jso, key, originsFlag)
    if (!origins) {
      continue
    }
    for (const origin of origins) {
      const fullPath = pathItemToFullPath(origin)
      if (fullPath[fullPath.length - 1] === key) {
        paths.push(fullPath.slice(0, -1))
      }
    }
  }
  return paths
}

/** The three entity kinds that carry a generated, hash-bearing key. */
const ENTITY_CONTAINERS = ['messages', 'channels', 'operations'] as const

export type AsyncApiEntityKind = typeof ENTITY_CONTAINERS[number]

/** What an entity is, and the raw source key it is declared under. */
export interface AsyncApiEntityRef {
  readonly kind: AsyncApiEntityKind
  readonly key: string
}

/** An opaque token equal for two nodes exactly when they are the same declared entity. */
export const entityRefToken = ({ kind, key }: AsyncApiEntityRef): string => `${kind}/${key}`

const asEntityRef = (declarationPath: JsonPath): AsyncApiEntityRef | undefined => {
  const key = declarationPath[declarationPath.length - 1]
  const container = declarationPath[declarationPath.length - 2]
  if (!isString(key) || !isString(container)) {
    return undefined
  }
  const kind = ENTITY_CONTAINERS.find(candidate => candidate === container)
  return kind === undefined ? undefined : { kind, key }
}

interface MemoizedEntityRef {
  readonly originsFlag: symbol
  readonly ref: AsyncApiEntityRef | undefined
}

const entityRefCache = new WeakMap<object, MemoizedEntityRef>()

/**
 * What entity a node *is*, derived from where its own properties are declared.
 *
 * This exists because object identity is not enough. A message reached through an operation's
 * `messages[]` is **not** the same object as the one under a channel's `messages` map - the
 * compare pipeline's per-reference decoration makes them distinct - so a pairing keyed by object
 * cannot be read at both sites. Its declaration key can, and it is the same `messageId` either
 * way.
 *
 * Container shapes are matched rather than merely taking the last segment, so a property
 * contributed by a `messageTraits` entry cannot be mistaken for the message's own declaration.
 * Every matching path must agree: a node whose properties claim two different declarations names
 * neither, and keeping the plain add/remove behaviour is the safe answer.
 */
export const entityRefOf = (node: object, originsFlag: symbol): AsyncApiEntityRef | undefined => {
  const memoized = entityRefCache.get(node)
  if (memoized && memoized.originsFlag === originsFlag) {
    return memoized.ref
  }
  const ref = resolveEntityRef(node, originsFlag)
  entityRefCache.set(node, { originsFlag, ref })
  return ref
}

const resolveEntityRef = (node: object, originsFlag: symbol): AsyncApiEntityRef | undefined => {
  let found: AsyncApiEntityRef | undefined
  for (const declarationPath of declarationPathsOf(node, originsFlag)) {
    const ref = asEntityRef(declarationPath)
    if (ref === undefined) {
      continue
    }
    if (found === undefined) {
      found = ref
    } else if (found.kind !== ref.kind || found.key !== ref.key) {
      return undefined
    }
  }
  return found
}

/**
 * The raw source keys of one entity kind in one document - `operationId`, `channelId` or
 * `messageId`, never a position in an array.
 *
 * This is what makes a *document-level* leftover rule expressible. §5.4's per-site rule ran the
 * semantic pass only where the base resolver left both an addition and a removal; its real
 * guarantee was that the pass can never contradict a key match. Globally that becomes: an entity
 * enters the pairing pool only when its raw key is absent from the other document's key set for
 * its kind. Without that, a sorted zip over an ambiguous group could pair `C -> A` while the base
 * resolver had already matched `B -> B` at the site.
 */
export interface AsyncApiEntityKeySpace {
  /**
   * One representative node per key. A message is reachable as several distinct objects - the
   * channel map value and each operation's array element - and any of them answers the identity
   * questions the same way, so the first one found stands for all.
   */
  readonly entityOf: ReadonlyMap<string, object>

  /** Every key of the kind. */
  readonly keys: ReadonlySet<string>
}

/**
 * The key a member message is known by, in a key space **shared by both documents**: the after
 * side canonicalizes each message onto the before-side key it was paired with, so a member whose
 * id merely churned reads identically on both sides.
 *
 * `undefined` means the message has no declaration key at all - it is declared inline, under no
 * container this recognizes - which makes its container uncharacterizable, exactly as an
 * unidentifiable payload does.
 */
export type MemberKeyResolver = (message: object) => string | undefined

/**
 * Semantic identities for the entities of one normalized document, plus the key spaces the
 * document-level pairing needs.
 *
 * Every entity kind returns `undefined` when it cannot be characterized - no address, no action,
 * or a message whose payload has no stable declaration path. `undefined` disables semantic
 * matching for that entity, which leaves it with the plain add/remove behaviour: strictly safer
 * than pairing on a partial identity.
 */
export interface AsyncApiLogicalIndex {
  /**
   * `action` x channel address x the sorted payload identities of the operation's messages x the
   * sorted canonical keys of those same messages.
   */
  identityOfOperation(operation: object, memberKey: MemberKeyResolver): SemanticIdentity | undefined

  /**
   * Channel address x the sorted payload identities of the channel's messages x the sorted
   * canonical keys of those same messages. The address alone is not enough - a generator emits
   * several channels on one address, differing only by text - and neither is the address plus the
   * payload set, which is what leaves the reference sample's two channels indistinguishable.
   *
   * The member keys are what separate them. They are safe to use *because* they are canonical: a
   * member whose id churned has already been mapped onto its before-side key by the message
   * pairing, so this segment can only split an ambiguous group, never merge two distinct ones.
   */
  identityOfChannel(channel: object, memberKey: MemberKeyResolver): SemanticIdentity | undefined

  /**
   * The sorted set of anchors the message hangs off - `(action, address)` for every operation
   * that references it and `(channel, address)` for every channel whose `messages` map holds it -
   * plus its payload identity.
   *
   * Both anchor kinds are needed because the two reachability routes are independent: an
   * operation's `messages[]` gives the action, a channel's map gives an address even for a
   * message no operation references, such as one used only from a reply.
   */
  identityOfMessage(message: object): SemanticIdentity | undefined

  readonly operations: AsyncApiEntityKeySpace
  readonly channels: AsyncApiEntityKeySpace
  readonly messages: AsyncApiEntityKeySpace
}

/** UTF-16 code unit ordering - deliberately not `localeCompare`, which is locale-dependent. */
const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Stands in for an `action` in a message anchor contributed by a channel rather than by an
 * operation. `send` and `receive` are the only actions AsyncAPI 3 defines, so this cannot collide
 * with a real one, and it keeps every anchor a fixed-arity pair - which is what makes the flat
 * segment list of `identityOfMessage` unambiguous.
 */
const CHANNEL_ANCHOR_ACTION = 'channel'

interface MessageAnchor {
  readonly action: string
  readonly address: string
}

const compareMessageAnchors = (a: MessageAnchor, b: MessageAnchor): number =>
  compareStrings(a.action, b.action) || compareStrings(a.address, b.address)

interface MutableKeySpace {
  readonly entityOf: Map<string, object>
  readonly keys: Set<string>
}

const emptyKeySpace = (): MutableKeySpace => ({ entityOf: new Map(), keys: new Set() })

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
  // Keyed by object rather than by declaration key: a payload identity is a pure function of the
  // node, so every instance of one message answers alike, and this only has to avoid repeating the
  // origins walk for a node already seen.
  const payloadIdentities = new Map<object, SemanticIdentity | undefined>()
  const payloadIdentityOf = (message: object): SemanticIdentity | undefined => {
    if (!isAsyncApiMessageObject(message)) { return undefined }
    if (payloadIdentities.has(message)) { return payloadIdentities.get(message) }
    const identity = payloadIdentity(message, originsFlag)
    payloadIdentities.set(message, identity)
    return identity
  }

  /**
   * The payload identities and the canonical member keys of one container's messages, the
   * payloads sorted then the keys sorted.
   *
   * All-or-nothing on purpose: one message we cannot characterize makes the whole container's
   * message set unknown, and pairing containers on a partial set could match two channels that
   * merely share an address and one message.
   *
   * Concatenating the two sorted runs is unambiguous because each contributes exactly one entry
   * per message: a `2n`-long result always splits at `n`, so no arrangement of one run can be
   * mistaken for an arrangement of the other.
   */
  const memberIdentitiesOf = (
    messages: readonly unknown[], memberKey: MemberKeyResolver,
  ): string[] | undefined => {
    const payloads: SemanticIdentity[] = []
    const keys: string[] = []
    for (const message of messages) {
      if (!isAsyncApiMessageObject(message)) { return undefined }
      const payload = payloadIdentityOf(message)
      if (payload === undefined) { return undefined }
      const key = memberKey(message)
      if (key === undefined) { return undefined }
      payloads.push(payload)
      keys.push(key)
    }
    return [...payloads.sort(compareStrings), ...keys.sort(compareStrings)]
  }

  const identityOfOperation = (
    operation: object, memberKey: MemberKeyResolver,
  ): SemanticIdentity | undefined => {
    if (!isAsyncApiOperationObject(operation)) { return undefined }
    // `action` and `channel` are non-optional in the spec types, but api-diff also compares
    // intentionally invalid and partial documents - check at runtime, never trust required-ness.
    const action = isString(operation.action) ? operation.action : undefined
    const address = addressOf(operation.channel)
    if (action === undefined || address === undefined) { return undefined }
    const members = memberIdentitiesOf(arrayValuesOf(operation, 'messages'), memberKey)
    if (members === undefined) { return undefined }
    return formatSemanticIdentity([action, address, ...members])
  }

  const identityOfChannel = (
    channel: object, memberKey: MemberKeyResolver,
  ): SemanticIdentity | undefined => {
    const address = addressOf(channel)
    if (address === undefined) { return undefined }
    const members = memberIdentitiesOf(objectValuesOf(channel, 'messages'), memberKey)
    if (members === undefined) { return undefined }
    return formatSemanticIdentity([address, ...members])
  }

  const components = isObject(root) ? root.components : undefined

  const operations = emptyKeySpace()
  const channels = emptyKeySpace()
  const messages = emptyKeySpace()

  /**
   * Files a node under the key its own origins say it is declared at, and remembers the first
   * node found for each key as that key's representative.
   *
   * Keyed by declaration rather than by the container's own key, so the operation array element
   * and the channel map value of one message land on the same entry - which is the whole point,
   * since they are different objects.
   */
  const register = (node: unknown): AsyncApiEntityRef | undefined => {
    if (!isObject(node)) { return undefined }
    const ref = entityRefOf(node, originsFlag)
    if (ref === undefined) { return undefined }
    const space = ref.kind === 'messages' ? messages : ref.kind === 'channels' ? channels : operations
    space.keys.add(ref.key)
    if (!space.entityOf.has(ref.key)) { space.entityOf.set(ref.key, node) }
    return ref
  }

  // message key -> the anchors it hangs off. Keyed by declaration key for the same reason.
  const messageAnchors = new Map<string, MessageAnchor[]>()

  const anchor = (message: unknown, action: string, address: string): void => {
    const ref = register(message)
    if (ref === undefined || ref.kind !== 'messages') { return }
    const anchors = messageAnchors.get(ref.key)
    if (!anchors) {
      messageAnchors.set(ref.key, [{ action, address }])
      return
    }
    // A set, not a list: one channel is walked both in its own right and as some operation's
    // `channel`, and a message may be referenced by several operations sharing an action and an
    // address. How many times an anchor is reachable is not part of what the message is.
    if (!anchors.some(known => known.action === action && known.address === address)) {
      anchors.push({ action, address })
    }
  }

  const registerChannel = (channel: unknown): void => {
    register(channel)
    const address = addressOf(channel)
    for (const message of objectValuesOf(channel, 'messages')) {
      if (address === undefined) { register(message) } else { anchor(message, CHANNEL_ANCHOR_ACTION, address) }
    }
  }

  const registerOperation = (operation: unknown): void => {
    register(operation)
    if (!isAsyncApiOperationObject(operation)) { return }
    registerChannel(operation.channel)
    const reply = isObject(operation) ? operation.reply : undefined
    if (isObject(reply)) {
      registerChannel(reply.channel)
      for (const message of arrayValuesOf(reply, 'messages')) { register(message) }
    }
    const action = isString(operation.action) ? operation.action : undefined
    const address = addressOf(operation.channel)
    for (const message of arrayValuesOf(operation, 'messages')) {
      if (action === undefined || address === undefined) {
        register(message)
      } else {
        anchor(message, action, address)
      }
    }
  }

  for (const message of objectValuesOf(components, 'messages')) { register(message) }
  for (const channel of objectValuesOf(root, 'channels')) { registerChannel(channel) }
  for (const channel of objectValuesOf(components, 'channels')) { registerChannel(channel) }
  for (const operation of objectValuesOf(root, 'operations')) { registerOperation(operation) }
  for (const operation of objectValuesOf(components, 'operations')) { registerOperation(operation) }
  // The reply rules are shared between `operations/*_/reply` and `components/replies/*_`, so a
  // reply reachable only through components has to be walked too.
  for (const reply of objectValuesOf(components, 'replies')) {
    registerChannel(isObject(reply) ? reply.channel : undefined)
    for (const message of arrayValuesOf(reply, 'messages')) { register(message) }
  }

  const identityOfMessage = (message: object): SemanticIdentity | undefined => {
    const payload = payloadIdentityOf(message)
    if (payload === undefined) { return undefined }
    const ref = entityRefOf(message, originsFlag)
    // Sorted so a message reachable from several channels or operations still gets a
    // deterministic identity.
    const anchors = [...(ref === undefined ? [] : messageAnchors.get(ref.key) ?? [])]
      .sort(compareMessageAnchors)
    return formatSemanticIdentity([...anchors.flatMap(({ action, address }) => [action, address]), payload])
  }

  return {
    identityOfOperation,
    identityOfChannel,
    identityOfMessage,
    operations,
    channels,
    messages,
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
