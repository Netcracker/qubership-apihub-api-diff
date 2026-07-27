//the issue: old spec on apiHub was incorrect, i.e. missed required fields
//fixing the old spec (adding required fields) should not be a breaking change

import {
  apiDiff,
  breaking,
  CompareOptions,
} from '../src'
import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG } from './helper'

import addSecuritySchemeTypeBefore from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-type/before.json'
import addSecuritySchemeTypeAfter from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-type/after.json'

import addSecuritySchemeNameBefore from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-name/before.json'
import addSecuritySchemeNameAfter from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-name/after.json'

import addSecuritySchemeInBefore from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-in/before.json'
import addSecuritySchemeInAfter from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-in/after.json'

import addSecuritySchemeSchemeBefore from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-scheme/before.json'
import addSecuritySchemeSchemeAfter from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-scheme/after.json'

import addSecuritySchemeOpenIdConnectUrlBefore from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-openIdConnectUrl/before.json'
import addSecuritySchemeOpenIdConnectUrlAfter from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-openIdConnectUrl/after.json'

import addSecuritySchemeFlowsBefore from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-flows/before.json'
import addSecuritySchemeFlowsAfter from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-flows/after.json'

import addSecuritySchemeAuthorizationCodeFlowBefore from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-authorizationcode-flow/before.json'
import addSecuritySchemeAuthorizationCodeFlowAfter from './helper/resources/adding-required-fields/asyncapi-add-securityscheme-authorizationcode-flow/after.json'

import addInfoBefore from './helper/resources/adding-required-fields/asyncapi-add-info/before.json'
import addInfoAfter from './helper/resources/adding-required-fields/asyncapi-add-info/after.json'

import addInfoFieldsBefore from './helper/resources/adding-required-fields/asyncapi-add-info-fields/before.json'
import addInfoFieldsAfter from './helper/resources/adding-required-fields/asyncapi-add-info-fields/after.json'

import addInfoLicenseNameBefore from './helper/resources/adding-required-fields/asyncapi-add-info-license-name/before.json'
import addInfoLicenseNameAfter from './helper/resources/adding-required-fields/asyncapi-add-info-license-name/after.json'

import addServersFieldsBefore from './helper/resources/adding-required-fields/asyncapi-add-servers-fields/before.json'
import addServersFieldsAfter from './helper/resources/adding-required-fields/asyncapi-add-servers-fields/after.json'

import addOperationsChannelBefore from './helper/resources/adding-required-fields/asyncapi-add-operations-channel/before.json'
import addOperationsChannelAfter from './helper/resources/adding-required-fields/asyncapi-add-operations-channel/after.json'

import addReplyAddressLocationBefore from './helper/resources/adding-required-fields/asyncapi-add-components-replyaddress-location/before.json'
import addReplyAddressLocationAfter from './helper/resources/adding-required-fields/asyncapi-add-components-replyaddress-location/after.json'

import addExternalDocsUrlBefore from './helper/resources/adding-required-fields/asyncapi-add-externaldocs-url/before.json'
import addExternalDocsUrlAfter from './helper/resources/adding-required-fields/asyncapi-add-externaldocs-url/after.json'

import addTagsNameBefore from './helper/resources/adding-required-fields/asyncapi-add-tags-name/before.json'
import addTagsNameAfter from './helper/resources/adding-required-fields/asyncapi-add-tags-name/after.json'

import addOperationsActionBefore from './helper/resources/adding-required-fields/asyncapi-add-operations-action/before.json'
import addOperationsActionAfter from './helper/resources/adding-required-fields/asyncapi-add-operations-action/after.json'

const TEST_COMPARE_OPTIONS: CompareOptions = {
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  validate: true,
  unify: true,
  liftCombiners: true,
  allowNotValidSyntheticChanges: true,
}

const notBreaking = (diffs: { type: unknown }[]) =>
  diffs.length > 0 && diffs.every(d => d.type !== breaking)

describe('asyncApi: adding previously missing required fields is not breaking', () => {

// ── components ────────────────────────────────────
  it('adding type to securityScheme is not breaking', () => {
    const { diffs } = apiDiff(
      addSecuritySchemeTypeBefore,
      addSecuritySchemeTypeAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

  it('adding name to securityScheme is not breaking', () => {
    const { diffs } = apiDiff(
      addSecuritySchemeNameBefore,
      addSecuritySchemeNameAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

  it('adding in to securityScheme is not breaking', () => {
    const { diffs } = apiDiff(
      addSecuritySchemeInBefore,
      addSecuritySchemeInAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

  it('adding scheme to securityScheme is not breaking', () => {
    const { diffs } = apiDiff(
      addSecuritySchemeSchemeBefore,
      addSecuritySchemeSchemeAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

  it('adding openIdConnectUrl to securityScheme is not breaking', () => {
    const { diffs } = apiDiff(
      addSecuritySchemeOpenIdConnectUrlBefore,
      addSecuritySchemeOpenIdConnectUrlAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

  it('adding authorizationUrl, tokenUrl, availableScopes to an existing flow at securityScheme is not breaking', () => {
    const { diffs } = apiDiff(
      addSecuritySchemeAuthorizationCodeFlowBefore,
      addSecuritySchemeAuthorizationCodeFlowAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

  it('adding location to replyAddress is not breaking', () => {
    const { diffs } = apiDiff(
      addReplyAddressLocationBefore,
      addReplyAddressLocationAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

// ── info ──────────────────────────────────────────────────────────────────────

  it('adding info is not breaking', () => {
    const { diffs } = apiDiff(
      addInfoBefore,
      addInfoAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

  it('adding info.title, info.version is not breaking', () => {
    const { diffs } = apiDiff(
      addInfoFieldsBefore,
      addInfoFieldsAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

  it('adding info.license.name is not breaking', () => {
    const { diffs } = apiDiff(
      addInfoLicenseNameBefore,
      addInfoLicenseNameAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

// ── servers ───────────────────────────────────────────────────────────────────

  it('adding servers fields at root, channel item and components is not breaking', () => {
    const { diffs } = apiDiff(
      addServersFieldsBefore,
      addServersFieldsAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

// ── operations ───────────────────────────────────────────────────────────────────

  it('adding channel to operations is not breaking', () => {
    const { diffs } = apiDiff(
      addOperationsChannelBefore,
      addOperationsChannelAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

// ── externalDocs ───────────────────────────────────────────────────────────────────

  it.skip('adding url to externalDocs at any level is not breaking', () => {
    const { diffs } = apiDiff(
      addExternalDocsUrlBefore,
      addExternalDocsUrlAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

// ── tags ───────────────────────────────────────────────────────────────────

  it('adding name to tags at any level is not breaking', () => {
    const { diffs } = apiDiff(
      addTagsNameBefore,
      addTagsNameAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(notBreaking(diffs)).toBe(true)
  })

// ── exceptional cases (current behaviour) ─────────────────────────────────────
// These fields cannot be tested as "adding X is not breaking" due to engine limitations.
// The tests below pin the actual current behaviour.

  // Without `openapi`, the unifier classifies the spec as JSON Schema.
  // Comparing a JSON Schema spec against an OpenAPI spec throws and error because spec types are incompatible.
  it('adding asyncapi field throws error', () => {
    const before = { info: { title: 'Test', version: '1.0.0' }, paths: {} }
    const after = { asyncapi: '3.0.0', info: { title: 'Test', version: '1.0.0' }, paths: {} }
    expect(() => apiDiff(before, after, TEST_COMPARE_OPTIONS)).toThrow(/Specification cannot be different./)
  })

  // AsyncAPI unifier synthesizes `flows: {}` for type:oauth2 even when absent,
  // so the diff always surfaces at the flow-type level rather than at `flows` itself.
  // The oAuthFlowsRules.$[0]=nonBreaking change is a defensive guard for unify:false callers.
  it('adding flows to securityScheme is breaking', () => {
    const { diffs } = apiDiff(
      addSecuritySchemeFlowsBefore,
      addSecuritySchemeFlowsAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(diffs.some(d => d.type === breaking)).toBe(true)
  })

  // some of the apiDiff logic is based on the operation.action value
  // therefore it was decided to keep adding operation.action as breaking change
  it('adding action to operations is breaking', () => {
    const { diffs } = apiDiff(
      addOperationsActionBefore,
      addOperationsActionAfter,
      TEST_COMPARE_OPTIONS,
    )
    expect(diffs.some(d => d.type === breaking)).toBe(true)
  })
})
