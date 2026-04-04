/**
 * Stable identifiers for JSON Schema classification rules.
 *
 * Naming conventions:
 *
 * `{api_type}.{keyword}[.{property}][.{item}][].{details}]`
 *   - api_type: JSON Schema type identifier, e.g. `json-schema`
 *   - keyword: kebab-case JSON Schema keyword (e.g. `type`, `enum`)
 *   - property: optional property name within that keyword (e.g. `required`, `default`, `properties`)
 *   - .item suffix: appended when the rule applies to individual array items
 *   - details: kebab-case phrase capturing the condition that determines classification
 */
export const JSON_SCHEMA_CLASSIFY_RULE_IDS = {
  /** JSON Schema `enum` array item change */
  ENUM_ITEM: 'json-schema.enum.item',
  /**
   * JSON Schema `enum` array item change — before enum array is non-empty.
   *
   * By default, adding item to non-empty `enum` is non-breaking.
   */
  ENUM_ITEM_BEFORE_ENUM_NON_EMPTY: 'json-schema.enum.item.before-enum-non-empty',
  /**
   * JSON Schema `enum` array item change — before enum array is empty.
   * By default, adding item to empty `enum` (introducing constraint) is breaking.
   */
  ENUM_ITEM_BEFORE_ENUM_EMPTY: 'json-schema.enum.item.before-enum-empty',
  /**
   * JSON Schema `enum` array item change — after enum array is non-empty.
   * By default, removing non-last item from `enum` is breaking.
   */
  ENUM_ITEM_AFTER_ENUM_NON_EMPTY: 'json-schema.enum.item.after-enum-non-empty',
  /**
   * JSON Schema `enum` array item change — after enum array is empty.
   * By default, removing last item from `enum` (removing constraint) is non-breaking.
   */
  ENUM_ITEM_AFTER_ENUM_EMPTY: 'json-schema.enum.item.after-enum-empty',
  /**
   * JSON Schema `required` array item was added or replaced and corresponding property in
   * after object has a `default` value.
   * By default, adding it to `required` is non-breaking.
   */
  REQUIRED_ITEM_AFTER_PROPERTY_HAS_DEFAULT: 'json-schema.required.item.after-property-has-default',
  /**
   * JSON Schema `required` array item was added or replaced and corresponding property in
   * after object has no `default` value.
   * By default, adding it to `required` is breaking.
   */
  REQUIRED_ITEM_AFTER_PROPERTY_HAS_NO_DEFAULT: 'json-schema.required.item.after-property-has-no-default',

  /**
   * JSON Schema `properties` item added the property is in the `required`
   * array AND has no `default` value.
   * By default, adding such property is breaking.
   */
  PROPERTY_AFTER_REQUIRED_NO_DEFAULT: 'json-schema.property.after-required-no-default',
  /**
   * JSON Schema `properties` item added the property is either NOT in the
   * `required` array OR it has a `default` value.
   * By default, adding such property is non-breaking.
   */
  PROPERTY_AFTER_OPTIONAL_OR_HAS_DEFAULT: 'json-schema.property.after-optional-or-has-default',
  /**
   * JSON Schema `properties` item removed — the property was required.
   * By default, removing such property is breaking.
   */
  PROPERTY_BEFORE_REQUIRED: 'json-schema.property.before-required',
  /**
   * JSON Schema `properties` item removed — the property was not required.
   * By default, removing such property is non-breaking.
   */
  PROPERTY_BEFORE_NOT_REQUIRED: 'json-schema.property.before-not-required',

  /** JSON Schema `properties` item replaced */
  PROPERTY: 'json-schema.property',

  /** JSON Schema `type` keyword — the type constraint is added to a previously unconstrained schema. */
  TYPE_ADD: 'json-schema.type.add',
  /** JSON Schema `type` keyword — the type constraint is removed, making the schema unconstrained. */
  TYPE_REMOVE: 'json-schema.type.remove',
  /**
   * JSON Schema `type` keyword replace — the after type is a superset of the before type
   * (e.g. `integer` → `number`).
   * By default, non-breaking for contravariant (request) schemas; breaking for covariant (response) schemas.
   */
  TYPE_REPLACE_AFTER_SUPERSET_BEFORE: 'json-schema.type.replace.after-is-superset-of-before',
  /**
   * JSON Schema `type` keyword replace — the after type is a subset of the before type
   * (e.g. `number` → `integer`).
   * By default, breaking for contravariant (request) schemas; non-breaking for covariant (response) schemas.
   */
  TYPE_REPLACE_AFTER_SUBSET_BEFORE: 'json-schema.type.replace.after-is-subset-of-before',
  /**
   * JSON Schema `type` keyword replace — the before and after types are mutually incompatible
   * (e.g. `string` → `integer`).
   * By default, always breaking in both request and response contexts.
   */
  TYPE_REPLACE_INCOMPATIBLE: 'json-schema.type.replace.incompatible',

  /**
   * JSON Schema `max*` keyword (maxLength, maxItems, maxProperties, non-draft-04 exclusiveMaximum)
   * — the constraint is added to a previously unconstrained schema.
   * By default, breaking (request); non-breaking (response).
   */
  MAX_ADD: 'json-schema.max.add',
  /**
   * JSON Schema `max*` keyword — the constraint is removed from the schema.
   * By default, non-breaking (request); breaking (response).
   */
  MAX_REMOVE: 'json-schema.max.remove',
  /**
   * JSON Schema `max*` keyword replace — the after value is greater than or equal to the before
   * value (both numeric), meaning the constraint was relaxed or kept the same.
   * By default, non-breaking (request); breaking (response).
   */
  MAX_REPLACE_CONSTRAINT_RELAXED: 'json-schema.max.replace.constraint-relaxed',
  /**
   * JSON Schema `max*` keyword replace — the after value is less than the before value, or either
   * value is non-numeric, meaning the constraint was tightened or is indeterminate.
   * By default, breaking (request); non-breaking (response).
   */
  MAX_REPLACE_CONSTRAINT_TIGHTENED: 'json-schema.max.replace.constraint-tightened',

  /**
   * JSON Schema `min*` keyword (minLength, minItems, minProperties, non-draft-04 exclusiveMinimum)
   * — the constraint is added to a previously unconstrained schema.
   * By default, breaking (request); non-breaking (response).
   */
  MIN_ADD: 'json-schema.min.add',
  /**
   * JSON Schema `min*` keyword — the constraint is removed from the schema.
   * By default, non-breaking (request); breaking (response).
   */
  MIN_REMOVE: 'json-schema.min.remove',
  /**
   * JSON Schema `min*` keyword replace — the after value is less than or equal to the before
   * value (both numeric), meaning the constraint was relaxed or kept the same.
   * By default, non-breaking (request); breaking (response).
   */
  MIN_REPLACE_CONSTRAINT_RELAXED: 'json-schema.min.replace.constraint-relaxed',
  /**
   * JSON Schema `min*` keyword replace — the after value is greater than the before value, or
   * either value is non-numeric, meaning the constraint was tightened or is indeterminate.
   * By default, breaking (request); non-breaking (response).
   */
  MIN_REPLACE_CONSTRAINT_TIGHTENED: 'json-schema.min.replace.constraint-tightened',

  /**
   * JSON Schema `minimum` keyword added — the before schema already has a numeric
   * `exclusiveMinimum` that is greater than or equal to the new `minimum` value,
   * so the new `minimum` does not introduce any tighter bound.
   * By default, non-breaking (request); breaking (response).
   */
  MINIMUM_ADD_BEFORE_EXCLUSIVE_MIN_COVERS: 'json-schema.minimum.add.before-exclusive-min-covers',
  /**
   * JSON Schema `additionalProperties` — the constraint is added (any action where before
   * and after are both truthy, or the property is newly added).
   * By default, breaking (both request and response).
   */
  ADDITIONAL_PROPERTIES_ADD: 'json-schema.additional-properties.add',
  /**
   * JSON Schema `additionalProperties` — the constraint is removed.
   * By default, breaking (both request and response).
   */
  ADDITIONAL_PROPERTIES_REMOVE: 'json-schema.additional-properties.remove',
  /**
   * JSON Schema `additionalProperties` replace — before-value is truthy (was restrictive)
   * and after-value is truthy (still restrictive).
   * By default, breaking (both request and response).
   */
  ADDITIONAL_PROPERTIES_REPLACE_BEFORE_TRUTHY_AFTER_TRUTHY: 'json-schema.additional-properties.replace.before-truthy-after-truthy',
  /**
   * JSON Schema `additionalProperties` replace — before-value is truthy (was restrictive)
   * and after-value is falsy (now permissive).
   * By default, breaking (request); non-breaking (response).
   */
  ADDITIONAL_PROPERTIES_REPLACE_BEFORE_TRUTHY_AFTER_FALSY: 'json-schema.additional-properties.replace.before-truthy-after-falsy',
  /**
   * JSON Schema `additionalProperties` replace — before-value is falsy (was permissive)
   * and after-value is truthy (now restrictive).
   * By default, non-breaking (request); breaking (response).
   */
  ADDITIONAL_PROPERTIES_REPLACE_BEFORE_FALSY_AFTER_TRUTHY: 'json-schema.additional-properties.replace.before-falsy-after-truthy',
  /**
   * JSON Schema `additionalProperties` replace — before-value is falsy (was permissive)
   * and after-value is falsy (still permissive).
   * By default, non-breaking (both request and response).
   */
  ADDITIONAL_PROPERTIES_REPLACE_BEFORE_FALSY_AFTER_FALSY: 'json-schema.additional-properties.replace.before-falsy-after-falsy',

  /**
   * JSON Schema `multipleOf` keyword — the constraint is added to a previously unconstrained
   * schema.
   * By default, breaking (request); non-breaking (response).
   */
  MULTIPLE_OF_ADD: 'json-schema.multiple-of.add',
  /**
   * JSON Schema `multipleOf` keyword — the constraint is removed from the schema.
   * By default, non-breaking (request); breaking (response).
   */
  MULTIPLE_OF_REMOVE: 'json-schema.multiple-of.remove',
  /**
   * JSON Schema `multipleOf` keyword replace — the old value is an exact multiple of the new
   * value (both numeric), so the new divisor is strictly more permissive.
   * By default, non-breaking (request); breaking (response).
   */
  MULTIPLE_OF_REPLACE_NEW_IS_DIVISOR_OF_OLD: 'json-schema.multiple-of.replace.new-is-divisor-of-old',
  /**
   * JSON Schema `multipleOf` keyword replace — either value is non-numeric, or the old value
   * is not an exact multiple of the new value.
   * By default, breaking (both request and response).
   */
  MULTIPLE_OF_REPLACE_NEW_IS_NOT_DIVISOR_OF_OLD: 'json-schema.multiple-of.replace.new-is-not-divisor-of-old',

  /**
   * JSON Schema draft-04 boolean `exclusiveMinimum` / `exclusiveMaximum` — added with value
   * `true`, activating the exclusive constraint.
   * By default, breaking (request); non-breaking (response).
   */
  EXCLUSIVE_ADD_AFTER_TRUE: 'json-schema.exclusive.add.after-true',
  /**
   * JSON Schema draft-04 boolean `exclusiveMinimum` / `exclusiveMaximum` — added with a value
   * other than `true` (e.g. `false`), so no exclusive constraint is activated.
   * By default, unclassified (both request and response).
   */
  EXCLUSIVE_ADD_AFTER_NOT_TRUE: 'json-schema.exclusive.add.after-not-true',
  /**
   * JSON Schema draft-04 boolean `exclusiveMinimum` / `exclusiveMaximum` — removed when its
   * before-value was `true`, deactivating the exclusive constraint.
   * By default, non-breaking (request); breaking (response).
   */
  EXCLUSIVE_REMOVE_BEFORE_TRUE: 'json-schema.exclusive.remove.before-true',
  /**
   * JSON Schema draft-04 boolean `exclusiveMinimum` / `exclusiveMaximum` — removed when its
   * before-value was not `true`, so no exclusive constraint was active.
   * By default, unclassified (both request and response).
   */
  EXCLUSIVE_REMOVE_BEFORE_NOT_TRUE: 'json-schema.exclusive.remove.before-not-true',
  /**
   * JSON Schema draft-04 boolean `exclusiveMinimum` / `exclusiveMaximum` replaced — after-value
   * is `true`, activating the exclusive constraint.
   * By default, breaking (request); non-breaking (response).
   */
  EXCLUSIVE_REPLACE_AFTER_TRUE: 'json-schema.exclusive.replace.after-true',
  /**
   * JSON Schema draft-04 boolean `exclusiveMinimum` / `exclusiveMaximum` replaced — after-value
   * is not `true`, so the exclusive constraint is deactivated or absent.
   * By default, non-breaking (request); breaking (response).
   */
  EXCLUSIVE_REPLACE_AFTER_NOT_TRUE: 'json-schema.exclusive.replace.after-not-true',

  /**
   * JSON Schema `minimum` keyword added — either no numeric `exclusiveMinimum` existed
   * in the before schema, or its value is less than the new `minimum`, meaning the new
   * `minimum` introduces a tighter lower bound.
   * By default, breaking (request); non-breaking (response).
   */
  MINIMUM_ADD_BEFORE_EXCLUSIVE_MIN_NOT_COVERS: 'json-schema.minimum.add.before-exclusive-min-not-covers',
  /**
   * JSON Schema `minimum` keyword removed — the lower-bound constraint is dropped.
   * By default, non-breaking (request); breaking (response).
   */
  MINIMUM_REMOVE: 'json-schema.minimum.remove',
  /**
   * JSON Schema `minimum` keyword replace — the after value is less than or equal to the before
   * value (both numeric), meaning the lower bound was relaxed or kept the same.
   * By default, non-breaking (request); breaking (response).
   */
  MINIMUM_REPLACE_CONSTRAINT_RELAXED: 'json-schema.minimum.replace.constraint-relaxed',
  /**
   * JSON Schema `minimum` keyword replace — the after value is greater than the before value,
   * or either value is non-numeric, meaning the lower bound was tightened or is indeterminate.
   * By default, breaking (request); non-breaking (response).
   */
  MINIMUM_REPLACE_CONSTRAINT_TIGHTENED: 'json-schema.minimum.replace.constraint-tightened',

  /**
   * JSON Schema `maximum` keyword added — the before schema already has a numeric
   * `exclusiveMaximum` that is less than or equal to the new `maximum` value,
   * so the new `maximum` does not introduce any tighter bound.
   * By default, non-breaking (request); breaking (response).
   */
  MAXIMUM_ADD_BEFORE_EXCLUSIVE_MAX_COVERS: 'json-schema.maximum.add.before-exclusive-max-covers',
  /**
   * JSON Schema `maximum` keyword added — either no numeric `exclusiveMaximum` existed
   * in the before schema, or its value is greater than the new `maximum`, meaning the new
   * `maximum` introduces a tighter upper bound.
   * By default, breaking (request); non-breaking (response).
   */
  MAXIMUM_ADD_BEFORE_EXCLUSIVE_MAX_NOT_COVERS: 'json-schema.maximum.add.before-exclusive-max-not-covers',
  /**
   * JSON Schema `maximum` keyword removed — the upper-bound constraint is dropped.
   * By default, non-breaking (request); breaking (response).
   */
  MAXIMUM_REMOVE: 'json-schema.maximum.remove',
  /**
   * JSON Schema `maximum` keyword replace — the after value is greater than or equal to the
   * before value (both numeric), meaning the upper bound was relaxed or kept the same.
   * By default, non-breaking (request); breaking (response).
   */
  MAXIMUM_REPLACE_CONSTRAINT_RELAXED: 'json-schema.maximum.replace.constraint-relaxed',
  /**
   * JSON Schema `maximum` keyword replace — the after value is less than the before value,
   * or either value is non-numeric, meaning the upper bound was tightened or is indeterminate.
   * By default, breaking (request); non-breaking (response).
   */
  MAXIMUM_REPLACE_CONSTRAINT_TIGHTENED: 'json-schema.maximum.replace.constraint-tightened',

  /**
   * JSON Schema `pattern` validator added.
   * By default, breaking (request); non-breaking (response).
   */
  PATTERN_ADD: 'json-schema.pattern.add',
  /**
   * JSON Schema `pattern` validator removed.
   * By default, non-breaking (request); breaking (response).
   */
  PATTERN_REMOVE: 'json-schema.pattern.remove',
  /**
   * JSON Schema `pattern` validator replaced.
   * By default, breaking (both request and response).
   */
  PATTERN_REPLACE: 'json-schema.pattern.replace',

  /**
   * JSON Schema `format` keyword added.
   * By default, breaking (request); non-breaking (response).
   */
  FORMAT_ADD: 'json-schema.format.add',
  /**
   * JSON Schema `format` keyword removed.
   * By default, non-breaking (request); breaking (response).
   */
  FORMAT_REMOVE: 'json-schema.format.remove',
  /**
   * JSON Schema `format` keyword replaced.
   * By default, breaking (both request and response).
   */
  FORMAT_REPLACE: 'json-schema.format.replace',

  /**
   * JSON Schema `uniqueItems` changed — after-value is `true` (enabling uniqueness constraint).
   * By default, breaking (request); non-breaking (response).
   */
  UNIQUE_ITEMS_AFTER_TRUE: 'json-schema.unique-items.after-true',
  /**
   * JSON Schema `uniqueItems` changed — after-value is not `true` (constraint absent or false).
   * By default, non-breaking (request); breaking (response).
   */
  UNIQUE_ITEMS_AFTER_NOT_TRUE: 'json-schema.unique-items.after-not-true',
  /**
   * JSON Schema `uniqueItems` removed.
   * By default, non-breaking (request); breaking (response).
   */
  UNIQUE_ITEMS_REMOVE: 'json-schema.unique-items.remove',

  /**
   * JSON Schema `readOnly` changed — after-value is `true` (marking field as read-only).
   * By default, breaking (request); non-breaking (response).
   */
  READ_ONLY_AFTER_TRUE: 'json-schema.read-only.after-true',
  /**
   * JSON Schema `readOnly` changed — after-value is not `true`.
   * By default, non-breaking (both request and response).
   */
  READ_ONLY_AFTER_NOT_TRUE: 'json-schema.read-only.after-not-true',
  /**
   * JSON Schema `readOnly` removed.
   * By default, non-breaking (both request and response).
   */
  READ_ONLY_REMOVE: 'json-schema.read-only.remove',

  /**
   * JSON Schema `writeOnly` added.
   * By default, non-breaking (both request and response).
   */
  WRITE_ONLY_ADD: 'json-schema.write-only.add',
  /**
   * JSON Schema `writeOnly` removed.
   * By default, non-breaking (both request and response).
   */
  WRITE_ONLY_REMOVE: 'json-schema.write-only.remove',
  /**
   * JSON Schema `writeOnly` replaced.
   * By default, non-breaking (both request and response).
   */
  WRITE_ONLY_REPLACE: 'json-schema.write-only.replace',

  /**
   * JSON Schema `default` value added.
   * By default, non-breaking (request); breaking (response).
   */
  DEFAULT_ADD: 'json-schema.default.add',
  /**
   * JSON Schema `default` value removed.
   * By default, breaking (request); non-breaking (response).
   */
  DEFAULT_REMOVE: 'json-schema.default.remove',
  /**
   * JSON Schema `default` value replaced.
   * By default, breaking (request); non-breaking (response).
   */
  DEFAULT_REPLACE: 'json-schema.default.replace',
} as const
