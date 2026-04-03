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
} as const
