// Property-name / kind constants for the ddlapi diff rules. The model enums are
// re-exported from ddlapi so the rule tree, classifiers, mappings and description
// calculators never hand-duplicate the string literals (apply the ddlapi-using skill).
export {
  AttrKind,
  DdlapiProperties,
  ExprKind,
  ObjectKind,
  ReferenceOption,
  SqlTypeName,
  TypeKind,
} from '@netcracker/qubership-apihub-ddlapi'
export {
  PG_DEFAULT_SCHEMA,
  PgSqlTypeName,
} from '@netcracker/qubership-apihub-ddlapi'

import { SPEC_TYPE_DDL_API_1 } from '@netcracker/qubership-apihub-api-unifier'

export type DdlApiSpecVersion = typeof SPEC_TYPE_DDL_API_1

// --- description template-param keys (see plan §10) ---
export const TEMPLATE_PARAM_FACET = 'facet'
export const TEMPLATE_PARAM_TABLE_NAME = 'tableName'
export const TEMPLATE_PARAM_COLUMN_NAME = 'columnName'
export const TEMPLATE_PARAM_SCHEMA_NAME = 'schemaName'
export const TEMPLATE_PARAM_ENUM_TYPE_NAME = 'enumTypeName'
export const TEMPLATE_PARAM_ENUM_VALUE = 'enumValue'
export const TEMPLATE_PARAM_OLD_VALUE = 'oldValue'
export const TEMPLATE_PARAM_NEW_VALUE = 'newValue'
export const TEMPLATE_PARAM_INDEX_NAME = 'indexName'
export const TEMPLATE_PARAM_FK_NAME = 'fkName'
export const TEMPLATE_PARAM_CHECK_NAME = 'checkName'

// --- description facet values (the `{{facet}}` slot) ---
export const FACET_TYPE = 'type'
export const FACET_NULLABILITY = 'nullability'
export const FACET_DEFAULT = 'default'
export const FACET_DESCRIPTION = 'description'

/**
 * How a dashboard/`SELECT` consumes a column's values. Type-change classification is expressed
 * in terms of these families rather than raw SQL type names (plan §7): a same-family change
 * keeps every previously-valid operation type-valid (non-breaking); a cross-family change
 * invalidates an operation (breaking). `Opaque` is the conservative catch-all (dialect
 * escape-hatch / undecidable) and is never "same family" as anything. This is a core-SQL
 * concept; a dialect only references it to map its escape-hatch types (`typeFamilyFor`).
 */
export const TypeConsumptionFamily = {
  Numeric: 'numeric',
  Textual: 'textual',
  Temporal: 'temporal',
  Boolean: 'boolean',
  Binary: 'binary',
  Uuid: 'uuid',
  Json: 'json',
  Enum: 'enum',
  Opaque: 'opaque',
} as const
export type TypeConsumptionFamily = typeof TypeConsumptionFamily[keyof typeof TypeConsumptionFamily]
