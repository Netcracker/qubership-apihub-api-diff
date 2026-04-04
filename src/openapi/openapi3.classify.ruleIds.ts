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

  // ---------------------------------------------------------------------------
  // Parameter Object (add / remove the whole parameter)
  // ---------------------------------------------------------------------------

  /** Parameter added — after-value is a standard header that is always ignored
   * (Accept, Content-Type, Authorization). By default, unclassified. */
  PARAM_AFTER_IGNORED_HEADER: 'rest.parameter.after-ignored-header',
  /** Parameter added — after-value is required (`required: true`) with no schema
   * default. By default, breaking. */
  PARAM_AFTER_REQUIRED_NO_DEFAULT: 'rest.parameter.after-required-no-default',
  /** Parameter added — after-value is optional or has a schema default.
   * By default, non-breaking. */
  PARAM_AFTER_OPTIONAL_OR_HAS_DEFAULT: 'rest.parameter.after-optional-or-has-default',
  /** Parameter removed — before-value was a standard ignored header.
   * By default, unclassified. */
  PARAM_BEFORE_IGNORED_HEADER: 'rest.parameter.before-ignored-header',
  /** Parameter removed — before-value was not an ignored header.
   * By default, breaking. */
  PARAM_BEFORE_NOT_IGNORED_HEADER: 'rest.parameter.before-not-ignored-header',
  /** Parameter replaced — always unclassified. */
  PARAM_REPLACE: 'rest.parameter.replace',

  // ---------------------------------------------------------------------------
  // Parameter Object > explode property
  // ---------------------------------------------------------------------------

  /** Parameter `explode` added — after-value is consistent with the default for the
   * parameter's style (e.g. explode=true for form style). By default, annotation. */
  PARAMETER_EXPLODE_AFTER_DEFAULT_FOR_STYLE: 'rest.parameter.explode.after-default-for-style',
  /** Parameter `explode` added — after-value is inconsistent with the style default.
   * By default, breaking. */
  PARAMETER_EXPLODE_AFTER_NON_DEFAULT_FOR_STYLE: 'rest.parameter.explode.after-non-default-for-style',
  /** Parameter `explode` removed — before-value was consistent with the style default.
   * By default, annotation. */
  PARAMETER_EXPLODE_BEFORE_DEFAULT_FOR_STYLE: 'rest.parameter.explode.before-default-for-style',
  /** Parameter `explode` removed — before-value was inconsistent with the style default.
   * By default, breaking. */
  PARAMETER_EXPLODE_BEFORE_NON_DEFAULT_FOR_STYLE: 'rest.parameter.explode.before-non-default-for-style',
  /** Parameter `explode` replaced — always breaking. */
  PARAMETER_EXPLODE_REPLACE: 'rest.parameter.explode.replace',

  // ---------------------------------------------------------------------------
  // Parameter Object > allowReserved property
  // ---------------------------------------------------------------------------

  /** Parameter `allowReserved` changed — parameter is in path, cookie, or header
   * location where allowReserved has no effect. By default, unclassified. */
  PARAMETER_ALLOW_RESERVED_AFTER_IN_NON_QUERY: 'rest.parameter.allow-reserved.after-in-non-query',
  /** Parameter `allowReserved` added or removed — parameter is in query location
   * where allowReserved is applicable. add→non-breaking, remove→breaking (YAML action filter). */
  PARAMETER_ALLOW_RESERVED_AFTER_IN_QUERY: 'rest.parameter.allow-reserved.after-in-query',
  /** Parameter `allowReserved` replaced to `true` in a query parameter.
   * By default, non-breaking. */
  PARAMETER_ALLOW_RESERVED_REPLACE_AFTER_TRUE: 'rest.parameter.allow-reserved.replace.after-true',
  /** Parameter `allowReserved` replaced to `false` (or falsy) in a query parameter.
   * By default, breaking. */
  PARAMETER_ALLOW_RESERVED_REPLACE_AFTER_FALSE: 'rest.parameter.allow-reserved.replace.after-false',

  // ---------------------------------------------------------------------------
  // Parameter Object > name property
  // ---------------------------------------------------------------------------

  /** Parameter `name` added. By default, non-breaking. */
  PARAMETER_NAME_ADD: 'rest.parameter.name.add',
  /** Parameter `name` removed. By default, breaking. */
  PARAMETER_NAME_REMOVE: 'rest.parameter.name.remove',
  /** Parameter `name` replaced — parameter is a path parameter, so the rename is
   * reflected in the path template. By default, annotation. */
  PARAMETER_NAME_REPLACE_BEFORE_PATH_PARAM: 'rest.parameter.name.replace.before-path-param',
  /** Parameter `name` replaced — parameter is not a path parameter (query, header,
   * cookie). By default, breaking. */
  PARAMETER_NAME_REPLACE_BEFORE_NON_PATH_PARAM: 'rest.parameter.name.replace.before-non-path-param',

  // ---------------------------------------------------------------------------
  // Parameter Object > required property
  // ---------------------------------------------------------------------------

  /** Parameter `required` added. By default, breaking. */
  PARAMETER_REQUIRED_ADD: 'rest.parameter.required.add',
  /** Parameter `required` removed. By default, non-breaking. */
  PARAMETER_REQUIRED_REMOVE: 'rest.parameter.required.remove',
  /** Parameter `required` replaced — the parameter schema has a `default` value,
   * so the effective requirement is satisfied. By default, non-breaking. */
  PARAMETER_REQUIRED_REPLACE_HAS_SCHEMA_DEFAULT: 'rest.parameter.required.replace.after-has-schema-default',
  /** Parameter `required` replaced to `true` with no schema default.
   * By default, breaking. */
  PARAMETER_REQUIRED_REPLACE_AFTER_TRUE_NO_DEFAULT: 'rest.parameter.required.replace.after-true-no-schema-default',
  /** Parameter `required` replaced to `false` (or removed requirement).
   * By default, non-breaking. */
  PARAMETER_REQUIRED_REPLACE_AFTER_FALSE: 'rest.parameter.required.replace.after-false',

  // ---------------------------------------------------------------------------
  // Parameter Object > allowEmptyValue property
  // ---------------------------------------------------------------------------

  /** Parameter `allowEmptyValue` changed — parameter is not in query location;
   * allowEmptyValue has no effect. By default, unclassified. */
  PARAMETER_ALLOW_EMPTY_VALUE_AFTER_NOT_QUERY: 'rest.parameter.allow-empty-value.after-not-query',
  /** Parameter `allowEmptyValue` changed in a query parameter — after-value is `true`
   * (enabling empty values, more permissive). By default, non-breaking. */
  PARAMETER_ALLOW_EMPTY_VALUE_AFTER_TRUE: 'rest.parameter.allow-empty-value.after-true',
  /** Parameter `allowEmptyValue` changed in a query parameter — after-value is not
   * `true` (disabling or absent). By default, breaking. */
  PARAMETER_ALLOW_EMPTY_VALUE_AFTER_NOT_TRUE: 'rest.parameter.allow-empty-value.after-not-true',

  // ---------------------------------------------------------------------------
  // Parameters array (the /parameters array node itself)
  // ---------------------------------------------------------------------------

  /** Parameters array added. By default, non-breaking. */
  PARAMETERS_ARRAY_ADD: 'rest.parameters-array.add',
  /** Parameters array removed — every before-entry is an ignored header.
   * By default, non-breaking. */
  PARAMETERS_ARRAY_REMOVE_BEFORE_ALL_IGNORED_HEADERS: 'rest.parameters-array.remove.before-all-ignored-headers',
  /** Parameters array removed — at least one before-entry is not an ignored header,
   * or before-value is not an array. By default, breaking. */
  PARAMETERS_ARRAY_REMOVE_BEFORE_HAS_NON_IGNORED: 'rest.parameters-array.remove.before-has-non-ignored',
  /** Parameters array replaced. By default, breaking. */
  PARAMETERS_ARRAY_REPLACE: 'rest.parameters-array.replace',

  // ---------------------------------------------------------------------------
  // Root-level security array
  // ---------------------------------------------------------------------------

  /** Global `security` array added — after-value is an empty array (no requirements).
   * By default, non-breaking. */
  GLOBAL_SECURITY_ADD_AFTER_EMPTY: 'rest.global-security.add.after-empty',
  /** Global `security` array added — after-value is non-empty (introduces requirements).
   * By default, breaking. */
  GLOBAL_SECURITY_ADD_AFTER_NON_EMPTY: 'rest.global-security.add.after-non-empty',
  /** Global `security` array removed. By default, non-breaking. */
  GLOBAL_SECURITY_REMOVE: 'rest.global-security.remove',
  /** Global `security` array replaced — after-value is a subset of (or equal to)
   * before-value, or after is empty. By default, non-breaking. */
  GLOBAL_SECURITY_REPLACE_AFTER_SUBSET_OR_EMPTY: 'rest.global-security.replace.after-subset-or-empty',
  /** Global `security` array replaced — after-value adds requirements not present
   * in before-value. By default, breaking. */
  GLOBAL_SECURITY_REPLACE_AFTER_NOT_SUBSET: 'rest.global-security.replace.after-not-subset',

  // ---------------------------------------------------------------------------
  // Root-level security array items
  // ---------------------------------------------------------------------------

  /** Global `security` array item added — the before-state OR-list was non-empty
   * (adding another option to an existing requirement set). By default, non-breaking. */
  GLOBAL_SECURITY_ITEM_ADD_BEFORE_NON_EMPTY: 'rest.global-security.item.before-non-empty',
  /** Global `security` array item added — the before-state OR-list was empty (this
   * item introduces the first security requirement). By default, breaking. */
  GLOBAL_SECURITY_ITEM_ADD_BEFORE_EMPTY: 'rest.global-security.item.before-empty',
  /** Global `security` array item removed — the after-state OR-list is still non-empty
   * (other options remain). By default, non-breaking. */
  GLOBAL_SECURITY_ITEM_REMOVE_AFTER_NON_EMPTY: 'rest.global-security.item.after-non-empty',
  /** Global `security` array item removed — the after-state OR-list is empty (this was
   * the last requirement entry). By default, breaking. */
  GLOBAL_SECURITY_ITEM_REMOVE_AFTER_EMPTY: 'rest.global-security.item.after-empty',
  /** Global `security` array item replaced — after-parent covers before-parent
   * requirements, or the item itself is empty. By default, non-breaking. */
  GLOBAL_SECURITY_ITEM_REPLACE_AFTER_SUBSET_OR_EMPTY: 'rest.global-security.item.replace.after-subset-or-empty',
  /** Global `security` array item replaced — after-parent does not cover before-parent
   * requirements. By default, breaking. */
  GLOBAL_SECURITY_ITEM_REPLACE_AFTER_NOT_SUBSET: 'rest.global-security.item.replace.after-not-subset',

  // ---------------------------------------------------------------------------
  // Path item (path rename / change)
  // ---------------------------------------------------------------------------

  /** Path item added. By default, non-breaking. */
  PATH_CHANGE_ADD: 'rest.path.add',
  /** Path item removed. By default, breaking. */
  PATH_CHANGE_REMOVE: 'rest.path.remove',
  /** Path item replaced — the effective (server-prefixed) path is unchanged, meaning
   * only parameter placeholder names changed. By default, annotation. */
  PATH_CHANGE_REPLACE_SAME_EFFECTIVE_PATH: 'rest.path.replace.same-effective-path',
  /** Path item replaced — the effective path differs. By default, breaking. */
  PATH_CHANGE_REPLACE_DIFFERENT_EFFECTIVE_PATH: 'rest.path.replace.different-effective-path',
  /**
   * The `pathChangeClassifyRuleIdRule` is attached to the `/*` wildcard inside
   * `/paths`, which matches both path items AND specification extensions (x-*).
   * When the key does NOT start with `/` the diff is a spec extension — its
   * engine type is `unclassified` and this ruleId conveys that to the OOB
   * classifier without conflicting with the path-specific ruleIds above.
   */
  PATH_CHANGE_NOT_APPLICABLE: 'rest.path.not-applicable',

  // ---------------------------------------------------------------------------
  // Parameter Object > in property
  // ---------------------------------------------------------------------------
  /** Parameter `in` property changed. add/replace=non-breaking (add), breaking (remove/replace). */
  PARAMETER_IN: 'rest.parameter.in',

  // ---------------------------------------------------------------------------
  // Parameter Object > style property
  // ---------------------------------------------------------------------------
  /** Parameter `style` changed. By default, always breaking. */
  PARAMETER_STYLE: 'rest.parameter.style',

  // ---------------------------------------------------------------------------
  // Parameter Object > schema node ($:)
  // ---------------------------------------------------------------------------
  /** Parameter `schema` node changed. By default, always breaking. */
  PARAMETER_SCHEMA: 'rest.parameter.schema',

  // ---------------------------------------------------------------------------
  // Headers Object (container)
  // ---------------------------------------------------------------------------
  /** Headers object added/removed/replaced. add=non-breaking, remove/replace=breaking. */
  HEADERS: 'rest.headers',
} as const
