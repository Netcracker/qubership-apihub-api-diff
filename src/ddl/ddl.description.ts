import {
  DIFF_ACTION_TO_ACTION_MAP,
  DIFF_ACTION_TO_PREPOSITION_MAP,
  diffDescription,
} from '../core'
import {
  Diff,
  DiffDescriptionRule,
  DiffTemplateParamsCalculator,
  DynamicParams,
  FAILED_PARAMS_CALCULATION,
  PrimitiveType,
} from '../types'
import {
  checkPrimitiveType,
  getKeyValue,
  isDiffAdd,
  isDiffRemove,
  isObject,
} from '../utils'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { DdlDiffDialect } from './ddl.dialect'
import {
  AttrKind,
  DdlapiProperties,
  FACET_DEFAULT,
  FACET_NULLABILITY,
  FACET_TYPE,
  TEMPLATE_PARAM_CHECK_NAME,
  TEMPLATE_PARAM_COLUMN_NAME,
  TEMPLATE_PARAM_ENUM_TYPE_NAME,
  TEMPLATE_PARAM_ENUM_VALUE,
  TEMPLATE_PARAM_FACET,
  TEMPLATE_PARAM_FK_NAME,
  TEMPLATE_PARAM_INDEX_NAME,
  TEMPLATE_PARAM_NEW_VALUE,
  TEMPLATE_PARAM_OLD_VALUE,
  TEMPLATE_PARAM_SCHEMA_NAME,
  TEMPLATE_PARAM_TABLE_NAME,
} from './ddl.const'
import { TEMPLATE_PARAM_ACTION, TEMPLATE_PARAM_PREPOSITION } from '../core/description'

// --- template families (plan §10). Article-less wording (§O5); the `in schema` variant
// wins only when a non-default `schemaName` param is supplied. The action is bracketed
// (`[Added]`/`[Deleted]`/`[Changed]`) and entity names / values are wrapped in apostrophes;
// `preposition` and `facet` are plain words and stay unquoted. ---

export const TABLE_TEMPLATES = [
  "[{{action}}] table '{{tableName}}'",
  "[{{action}}] table '{{tableName}}' in schema '{{schemaName}}'",
]

export const COLUMN_TEMPLATES = [
  "[{{action}}] column '{{columnName}}' {{preposition}} table '{{tableName}}'",
  "[{{action}}] column '{{columnName}}' {{preposition}} table '{{tableName}}' in schema '{{schemaName}}'",
]

// type / nullability / default / description — facet, with optional from/to (used when both
// old & new resolve) and optional in-schema clause. Suitability picks the richest variant.
export const COLUMN_FACET_TEMPLATES = [
  "[{{action}}] {{facet}} for column '{{columnName}}' of table '{{tableName}}'",
  "[{{action}}] {{facet}} for column '{{columnName}}' of table '{{tableName}}' in schema '{{schemaName}}'",
  "[{{action}}] {{facet}} for column '{{columnName}}' of table '{{tableName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] {{facet}} for column '{{columnName}}' of table '{{tableName}}' in schema '{{schemaName}}' from '{{oldValue}}' to '{{newValue}}'",
]

export const ENUM_VALUE_TEMPLATES = [
  "[{{action}}] value '{{enumValue}}' {{preposition}} enum '{{enumTypeName}}'",
  "[{{action}}] value '{{enumValue}}' {{preposition}} enum '{{enumTypeName}}' in schema '{{schemaName}}'",
]

// Descriptions (Comment attr) at schema / table / column level. The entity word is fixed by
// which level params the calculator supplies; suitability picks the richest (column > table >
// schema). `from/to` variants are used for a text change.
export const COMMENT_TEMPLATES = [
  "[{{action}}] description for schema '{{schemaName}}'",
  "[{{action}}] description for schema '{{schemaName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] description for table '{{tableName}}'",
  "[{{action}}] description for table '{{tableName}}' in schema '{{schemaName}}'",
  "[{{action}}] description for table '{{tableName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] description for table '{{tableName}}' in schema '{{schemaName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] description for column '{{columnName}}' of table '{{tableName}}'",
  "[{{action}}] description for column '{{columnName}}' of table '{{tableName}}' in schema '{{schemaName}}'",
  "[{{action}}] description for column '{{columnName}}' of table '{{tableName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] description for column '{{columnName}}' of table '{{tableName}}' in schema '{{schemaName}}' from '{{oldValue}}' to '{{newValue}}'",
]

// Phase-3 access structures (plan §10/§12). The richest matching variant wins, so a primary
// key (no indexName) selects the "primary key" family and a named index selects the "index"
// family.
export const INDEX_TEMPLATES = [
  "[{{action}}] primary key on table '{{tableName}}'",
  "[{{action}}] primary key on table '{{tableName}}' in schema '{{schemaName}}'",
  "[{{action}}] index '{{indexName}}' on table '{{tableName}}'",
  "[{{action}}] index '{{indexName}}' on table '{{tableName}}' in schema '{{schemaName}}'",
]

export const FOREIGN_KEY_TEMPLATES = [
  "[{{action}}] foreign key '{{fkName}}' on table '{{tableName}}'",
  "[{{action}}] foreign key '{{fkName}}' on table '{{tableName}}' in schema '{{schemaName}}'",
]

export const CHECK_TEMPLATES = [
  "[{{action}}] check '{{checkName}}' on table '{{tableName}}'",
  "[{{action}}] check '{{checkName}}' on table '{{tableName}}' in schema '{{schemaName}}'",
]

export const tableDescription: DiffDescriptionRule = diffDescription(TABLE_TEMPLATES)
export const columnDescription: DiffDescriptionRule = diffDescription(COLUMN_TEMPLATES)
export const columnFacetDescription: DiffDescriptionRule = diffDescription(COLUMN_FACET_TEMPLATES)
export const enumValueDescription: DiffDescriptionRule = diffDescription(ENUM_VALUE_TEMPLATES)
export const commentDescription: DiffDescriptionRule = diffDescription(COMMENT_TEMPLATES)
export const indexDescription: DiffDescriptionRule = diffDescription(INDEX_TEMPLATES)
export const foreignKeyDescription: DiffDescriptionRule = diffDescription(FOREIGN_KEY_TEMPLATES)
export const checkDescription: DiffDescriptionRule = diffDescription(CHECK_TEMPLATES)

const lastSegments = (path: ReadonlyArray<PropertyKey>): [PropertyKey | undefined, PropertyKey | undefined] =>
  [path[path.length - 2], path[path.length - 1]]

/** Renders a SchemaType into a readable SQL type string, e.g. `varchar(200)`, `numeric(10,2)`. */
const renderType = (schemaType: unknown): string | undefined => {
  if (!isObject(schemaType)) { return undefined }
  const name = schemaType[DdlapiProperties.Type]
  if (typeof name !== 'string') { return undefined }
  const size = schemaType[DdlapiProperties.Size]
  if (typeof size === 'number') { return `${name}(${size})` }
  const precision = schemaType[DdlapiProperties.Precision]
  if (typeof precision === 'number') {
    const scale = schemaType[DdlapiProperties.Scale]
    return typeof scale === 'number' ? `${name}(${precision},${scale})` : `${name}(${precision})`
  }
  return name
}

const renderNullability = (value: unknown): string | undefined => {
  if (value === true) { return 'nullable' }
  if (value === false) { return 'not nullable' }
  return undefined
}

const nameOf = (node: unknown, property: PropertyKey = DdlapiProperties.Name): PrimitiveType | undefined => {
  return isObject(node) ? checkPrimitiveType(node[property]) : undefined
}

// `beforeValue`/`afterValue` live on specific Diff union members; read them safely.
const beforeValueOf = (diff: Diff): unknown => (isDiffAdd(diff) ? undefined : (diff as { beforeValue?: unknown }).beforeValue)
const afterValueOf = (diff: Diff): unknown => (isDiffRemove(diff) ? undefined : (diff as { afterValue?: unknown }).afterValue)

const SCHEMA_DEPTH = 2 // ['schemas', si]
const TABLE_DEPTH = 4 // ['schemas', si, 'tables', ti]
const COLUMN_DEPTH = 6 // ['schemas', si, 'tables', ti, 'columns', ci]
const ENUM_DEPTH = 4 // ['schemas', si, 'objects', oi]

/**
 * Single descriptionParamCalculator for the ddlapi rules. Classifies the change by the tail
 * of its declaration path, then resolves entity names by slicing that canonical declaration
 * path against the diff side's realm root (robust for shared nodes — a shared enum/column is
 * resolved from its own origin, not the crawl route that reached it). Old/new values come
 * from the diff. The `in schema` clause is dropped for the dialect default schema by omitting
 * `schemaName` (§O7) so the shorter template wins.
 */
export const createDdlParamsCalculator = (dialect: DdlDiffDialect): DiffTemplateParamsCalculator => {
  const schemaParam = (root: unknown, path: JsonPath): PrimitiveType | undefined => {
    const schemaName = nameOf(getKeyValue(root, ...path.slice(0, SCHEMA_DEPTH)))
    // Drop the schema clause for the default schema so the shorter template is selected.
    return schemaName === dialect.defaultSchemaName ? undefined : schemaName
  }

  return (diff, ctx) => {
    const base: DynamicParams = {
      [TEMPLATE_PARAM_ACTION]: DIFF_ACTION_TO_ACTION_MAP[diff.action],
      [TEMPLATE_PARAM_PREPOSITION]: DIFF_ACTION_TO_PREPOSITION_MAP[diff.action],
    }
    // Resolve against the side that carries the change (remove → before, else after).
    const remove = isDiffRemove(diff)
    const root = (remove ? ctx.before : ctx.after).root
    const sidePaths = remove ? diff.beforeDeclarationPaths : (diff as { afterDeclarationPaths: JsonPath[] }).afterDeclarationPaths
    if (!sidePaths || sidePaths.length === 0) { return FAILED_PARAMS_CALCULATION }

    const pathWhere = (predicate: (p: JsonPath) => boolean): JsonPath | undefined => sidePaths.find(predicate)
    const nodeAt = (path: JsonPath, depth: number): unknown => getKeyValue(root, ...path.slice(0, depth))

    // table add/remove
    const tablePath = pathWhere(p => lastSegments(p)[0] === DdlapiProperties.Tables && typeof lastSegments(p)[1] === 'number')
    if (tablePath) {
      return {
        ...base,
        [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(tablePath, TABLE_DEPTH)),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, tablePath),
      }
    }

    // column add/remove
    const columnPath = pathWhere(p => lastSegments(p)[0] === DdlapiProperties.Columns && typeof lastSegments(p)[1] === 'number')
    if (columnPath) {
      return {
        ...base,
        [TEMPLATE_PARAM_COLUMN_NAME]: nameOf(nodeAt(columnPath, COLUMN_DEPTH)),
        [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(columnPath, TABLE_DEPTH)),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, columnPath),
      }
    }

    // column type change — a property of the SchemaType (column.type.type.{type|size|…}).
    // Detect the columnType.type → SchemaType boundary (two consecutive `type` segments before
    // the changed property) and render the whole type from the immediate parent on each side,
    // so any subfield change reads "from <type> to <type>" (the parent SchemaType is present on
    // both sides even for an added/removed subfield).
    const typePath = pathWhere(p => p.length >= 3 && p[p.length - 2] === DdlapiProperties.Type && p[p.length - 3] === DdlapiProperties.Type)
    if (typePath) {
      return {
        ...base,
        [TEMPLATE_PARAM_FACET]: FACET_TYPE,
        [TEMPLATE_PARAM_COLUMN_NAME]: nameOf(nodeAt(typePath, COLUMN_DEPTH)),
        [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(typePath, TABLE_DEPTH)),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, typePath),
        [TEMPLATE_PARAM_OLD_VALUE]: renderType(ctx.before.parentContext?.value),
        [TEMPLATE_PARAM_NEW_VALUE]: renderType(ctx.after.parentContext?.value),
      }
    }

    // nullability change — column.type.null
    const nullPath = pathWhere(p => lastSegments(p)[0] === DdlapiProperties.Type && lastSegments(p)[1] === DdlapiProperties.Null)
    if (nullPath) {
      return {
        ...base,
        [TEMPLATE_PARAM_FACET]: FACET_NULLABILITY,
        [TEMPLATE_PARAM_COLUMN_NAME]: nameOf(nodeAt(nullPath, COLUMN_DEPTH)),
        [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(nullPath, TABLE_DEPTH)),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, nullPath),
        [TEMPLATE_PARAM_OLD_VALUE]: renderNullability(beforeValueOf(diff)),
        [TEMPLATE_PARAM_NEW_VALUE]: renderNullability(afterValueOf(diff)),
      }
    }

    // column default change — leaf inside the Expr (default.value | default.expr)
    const defaultLeafPath = pathWhere(p => lastSegments(p)[0] === DdlapiProperties.Default &&
      (lastSegments(p)[1] === DdlapiProperties.Value || lastSegments(p)[1] === DdlapiProperties.Expr))
    if (defaultLeafPath) {
      return {
        ...base,
        [TEMPLATE_PARAM_FACET]: FACET_DEFAULT,
        [TEMPLATE_PARAM_COLUMN_NAME]: nameOf(nodeAt(defaultLeafPath, COLUMN_DEPTH)),
        [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(defaultLeafPath, TABLE_DEPTH)),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, defaultLeafPath),
        [TEMPLATE_PARAM_OLD_VALUE]: checkPrimitiveType(beforeValueOf(diff)),
        [TEMPLATE_PARAM_NEW_VALUE]: checkPrimitiveType(afterValueOf(diff)),
      }
    }

    // column default add/remove — the whole Expr node (no from/to → plain facet template)
    const defaultPath = pathWhere(p => p[p.length - 1] === DdlapiProperties.Default)
    if (defaultPath) {
      return {
        ...base,
        [TEMPLATE_PARAM_FACET]: FACET_DEFAULT,
        [TEMPLATE_PARAM_COLUMN_NAME]: nameOf(nodeAt(defaultPath, COLUMN_DEPTH)),
        [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(defaultPath, TABLE_DEPTH)),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, defaultPath),
      }
    }

    // primary key add/remove (and unique/part changes under it)
    const pkPath = pathWhere(p => p.includes(DdlapiProperties.PrimaryKey))
    if (pkPath) {
      return {
        ...base,
        [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(pkPath, TABLE_DEPTH)),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, pkPath),
      }
    }

    // index add/remove and its unique / parts / seqNo changes
    const indexPath = pathWhere(p => p.includes(DdlapiProperties.Indexes))
    if (indexPath) {
      const indexIdx = indexPath.indexOf(DdlapiProperties.Indexes)
      return {
        ...base,
        [TEMPLATE_PARAM_INDEX_NAME]: nameOf(nodeAt(indexPath, indexIdx + 2)),
        [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(indexPath, TABLE_DEPTH)),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, indexPath),
      }
    }

    // foreign key add/remove and its onUpdate/onDelete/refColumns changes
    const fkPath = pathWhere(p => p.includes(DdlapiProperties.ForeignKeys))
    if (fkPath) {
      const fkIdx = fkPath.indexOf(DdlapiProperties.ForeignKeys)
      const fkNode = nodeAt(fkPath, fkIdx + 2)
      const fkName = nameOf(fkNode, DdlapiProperties.Symbol) ?? nameOf(fkNode)
      return {
        ...base,
        [TEMPLATE_PARAM_FK_NAME]: fkName,
        [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(fkPath, TABLE_DEPTH)),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, fkPath),
      }
    }

    // attrs[*] / objects[*] — a Check (dual-role) or a Comment (description) member
    const containerKey = pathWhere(p => p.includes(DdlapiProperties.Attrs))
      ? DdlapiProperties.Attrs
      : (pathWhere(p => p.includes(DdlapiProperties.Objects)) ? DdlapiProperties.Objects : undefined)
    const memberPath = containerKey ? pathWhere(p => p.includes(containerKey)) : undefined
    if (memberPath && containerKey) {
      const containerIdx = memberPath.indexOf(containerKey)
      const member = nodeAt(memberPath, containerIdx + 2)
      const kind = isObject(member) ? member[DdlapiProperties.Kind] : undefined
      const level = memberPath[containerIdx - 2]
      const textChange = memberPath[memberPath.length - 1] === DdlapiProperties.Text
      const oldNew = textChange
        ? {
          [TEMPLATE_PARAM_OLD_VALUE]: checkPrimitiveType(beforeValueOf(diff)),
          [TEMPLATE_PARAM_NEW_VALUE]: checkPrimitiveType(afterValueOf(diff)),
        }
        : {}

      // Check — same classify/describe whether it lives in attrs[] or objects[] (T5.3).
      if (kind === AttrKind.Check) {
        return {
          ...base,
          [TEMPLATE_PARAM_CHECK_NAME]: nameOf(member),
          [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(memberPath, TABLE_DEPTH)),
          [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, memberPath),
        }
      }

      // Comment — description at schema / table / column level (T4.3).
      if (kind === AttrKind.Comment) {
        if (level === DdlapiProperties.Schemas) {
          // schema is the subject here — keep its name even when it is the default schema.
          return { ...base, ...oldNew, [TEMPLATE_PARAM_SCHEMA_NAME]: nameOf(nodeAt(memberPath, SCHEMA_DEPTH)) }
        }
        if (level === DdlapiProperties.Tables) {
          return {
            ...base,
            ...oldNew,
            [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(memberPath, TABLE_DEPTH)),
            [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, memberPath),
          }
        }
        if (level === DdlapiProperties.Columns) {
          return {
            ...base,
            ...oldNew,
            [TEMPLATE_PARAM_COLUMN_NAME]: nameOf(nodeAt(memberPath, COLUMN_DEPTH)),
            [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(memberPath, TABLE_DEPTH)),
            [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, memberPath),
          }
        }
      }
    }

    // enum value add/remove — EnumType.values[*]
    const enumValuePath = pathWhere(p => lastSegments(p)[0] === DdlapiProperties.Values && typeof lastSegments(p)[1] === 'number')
    if (enumValuePath) {
      const enumValue = checkPrimitiveType(afterValueOf(diff)) ?? checkPrimitiveType(beforeValueOf(diff))
      return {
        ...base,
        [TEMPLATE_PARAM_ENUM_VALUE]: enumValue,
        [TEMPLATE_PARAM_ENUM_TYPE_NAME]: nameOf(nodeAt(enumValuePath, ENUM_DEPTH), DdlapiProperties.Type),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, enumValuePath),
      }
    }

    return base
  }
}
