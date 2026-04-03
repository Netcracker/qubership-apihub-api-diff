/**
 * Stable identifiers for OpenAPI 3.x classification rules.
 *
 * Naming conventions:
 *
 * `{api_type}.{object}.{property}[.item].{details}`
 *   - api_type: REST API type identifier, e.g. `rest`
 *   - object: kebab-case OAS object name (e.g. `operation`, `parameter`)
 *   - property: property name within that object (e.g. `security`, `required`)
 *   - .item suffix: appended when the rule applies to individual array items
 *   - details: kebab-case phrase capturing the condition that determines classification
 */
export const REST_CLASSIFY_RULE_IDS = {
  /**
   * OAS "Operation Object" > `security` array — the resulting after-state security
   * requirements are empty or a subset of the before-state (global or operation-level).
   * This case is non-breaking: consumers already satisfying the old requirements still can.
   */
  OPERATION_SECURITY_SUBSET: 'rest.operation.security.after-security-requirements-are-subset-of-before',
  /**
   * OAS "Operation Object" > `security` array — the resulting after-state security
   * requirements are NOT a subset of the before-state.
   * This case is breaking: consumers may no longer satisfy the new requirements.
   */
  OPERATION_SECURITY_NOT_SUBSET: 'rest.operation.security.after-security-requirements-are-not-a-subset-of-before',

  /**
   * OAS "Operation Object" > `security` array item — the surrounding after-state
   * security array (OR-list) remains compatible: either the whole OR-list still
   * covers before, or the changed item itself is empty.
   * This case is non-breaking.
   */
  OPERATION_SECURITY_ITEM_SUBSET: 'rest.operation.security.item.after-security-requirements-are-subset-of-before',
  /**
   * OAS "Operation Object" > `security` array item — the surrounding after-state
   * security array introduces a requirement that is NOT covered by the before-state.
   * This case is breaking.
   */
  OPERATION_SECURITY_ITEM_NOT_SUBSET: 'rest.operation.security.item.after-security-requirements-are-not-a-subset-of-before',
} as const
