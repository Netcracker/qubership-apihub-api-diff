import { DdlDiffDialect, DIALECT_ID_POSTGRES } from './ddl.dialect'
import { PG_DEFAULT_SCHEMA } from './ddl.const'

/**
 * PostgreSQL diff dialect. For now it only supplies the default-schema name and leaves
 * the escape-hatch `*RulesFor` lookups empty (unknown PG kinds fall through to the core
 * `unclassified` catch-all — phase 4). `typeFamilyFor` is added in T2.4. Kept deliberately
 * parallel to api-unifier's `DIALECT_POSTGRES` (plan §5/D2).
 */
export const DIALECT_DIFF_POSTGRES: DdlDiffDialect = {
  id: DIALECT_ID_POSTGRES,
  defaultSchemaName: PG_DEFAULT_SCHEMA,
  attrRulesFor: () => undefined,
  objectRulesFor: () => undefined,
  typeRulesFor: () => undefined,
}
