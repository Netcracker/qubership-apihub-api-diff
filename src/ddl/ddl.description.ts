import {
  DIFF_ACTION_TO_ACTION_MAP,
  DIFF_ACTION_TO_PREPOSITION_MAP,
  DiffAction,
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
  isArray,
  isDiffAdd,
  isDiffRemove,
  isObject,
} from '../utils'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { DdlDiffDialect } from './ddl.dialect'
import {
  AttrKind,
  DdlapiProperties,
  DESCRIPTION_VALUE_MAX_LENGTH,
  FACET_COLLATION,
  FACET_DEFAULT,
  FACET_GENERATED,
  FACET_NULLABILITY,
  FACET_TYPE,
  TEMPLATE_PARAM_CHECK_NAME,
  TEMPLATE_PARAM_COLUMN_NAME,
  TEMPLATE_PARAM_COLUMNS_CLAUSE,
  TEMPLATE_PARAM_ENUM_TYPE_NAME,
  TEMPLATE_PARAM_ENUM_VALUE,
  TEMPLATE_PARAM_FACET,
  TEMPLATE_PARAM_FK_ACTION,
  TEMPLATE_PARAM_FK_NAME,
  TEMPLATE_PARAM_INDEX_KIND,
  TEMPLATE_PARAM_INDEX_NAME,
  TEMPLATE_PARAM_LOCAL_CLAUSE,
  TEMPLATE_PARAM_NEW_VALUE,
  TEMPLATE_PARAM_OLD_VALUE,
  TEMPLATE_PARAM_PART_CLAUSE,
  TEMPLATE_PARAM_REF_CLAUSE,
  TEMPLATE_PARAM_SCHEMA_NAME,
  TEMPLATE_PARAM_TABLE_NAME,
  TEMPLATE_PARAM_VALUE,
} from './ddl.const'
import { TEMPLATE_PARAM_ACTION, TEMPLATE_PARAM_PREPOSITION } from '../core/description'

// --- template families. Article-less wording; the `in schema` variant
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

// type / constraint(nullability) / default / collation / generated — facet, with an optional
// inline `'{{value}}'` (add/delete carry the single value), optional from/to (a change, when
// both endpoints resolve) and optional in-schema clause. Suitability picks the richest variant.
export const COLUMN_FACET_TEMPLATES = [
  "[{{action}}] {{facet}} for column '{{columnName}}' of table '{{tableName}}'",
  "[{{action}}] {{facet}} for column '{{columnName}}' of table '{{tableName}}' in schema '{{schemaName}}'",
  "[{{action}}] {{facet}} '{{value}}' for column '{{columnName}}' of table '{{tableName}}'",
  "[{{action}}] {{facet}} '{{value}}' for column '{{columnName}}' of table '{{tableName}}' in schema '{{schemaName}}'",
  "[{{action}}] {{facet}} for column '{{columnName}}' of table '{{tableName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] {{facet}} for column '{{columnName}}' of table '{{tableName}}' in schema '{{schemaName}}' from '{{oldValue}}' to '{{newValue}}'",
]

export const ENUM_VALUE_TEMPLATES = [
  "[{{action}}] value '{{enumValue}}' {{preposition}} enum '{{enumTypeName}}'",
  "[{{action}}] value '{{enumValue}}' {{preposition}} enum '{{enumTypeName}}' in schema '{{schemaName}}'",
]

// Descriptions (Comment attr) at schema / table / column level. The entity word is fixed by
// which level params the calculator supplies; suitability picks the richest (column > table >
// schema). Add/delete carry the (truncated) comment text inline as `'{{value}}'`; a text change
// uses the `from/to` variant. The comment text is free-form so it is always truncated upstream.
export const COMMENT_TEMPLATES = [
  "[{{action}}] description for schema '{{schemaName}}'",
  "[{{action}}] description '{{value}}' for schema '{{schemaName}}'",
  "[{{action}}] description for schema '{{schemaName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] description for table '{{tableName}}'",
  "[{{action}}] description for table '{{tableName}}' in schema '{{schemaName}}'",
  "[{{action}}] description '{{value}}' for table '{{tableName}}'",
  "[{{action}}] description '{{value}}' for table '{{tableName}}' in schema '{{schemaName}}'",
  "[{{action}}] description for table '{{tableName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] description for table '{{tableName}}' in schema '{{schemaName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] description for column '{{columnName}}' of table '{{tableName}}'",
  "[{{action}}] description for column '{{columnName}}' of table '{{tableName}}' in schema '{{schemaName}}'",
  "[{{action}}] description '{{value}}' for column '{{columnName}}' of table '{{tableName}}'",
  "[{{action}}] description '{{value}}' for column '{{columnName}}' of table '{{tableName}}' in schema '{{schemaName}}'",
  "[{{action}}] description for column '{{columnName}}' of table '{{tableName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] description for column '{{columnName}}' of table '{{tableName}}' in schema '{{schemaName}}' from '{{oldValue}}' to '{{newValue}}'",
]

// Access structures (indexes, primary keys). The richest matching variant wins, so a primary
// key (no indexName) selects the "primary key" family and a named index selects an "index"
// variant. The same family serves the whole index/PK *and* its sub-changes (a key column
// added/removed, a part reordered, the unique flag flipped) — the calculator supplies the
// params for exactly one variant per diff. The plain `on table` rows are name-only fallbacks
// (Principle B) for sub-changes that do not carry their own richer clause.
export const INDEX_TEMPLATES = [
  // primary key (no name): name-only fallback, then enriched with its key columns
  "[{{action}}] primary key on table '{{tableName}}'",
  "[{{action}}] primary key on table '{{tableName}}' in schema '{{schemaName}}'",
  "[{{action}}] primary key on {{columnsClause}} of table '{{tableName}}'",
  "[{{action}}] primary key on {{columnsClause}} of table '{{tableName}}' in schema '{{schemaName}}'",
  // index name-only fallback (also serves an unrecognised index change)
  "[{{action}}] index '{{indexName}}' on table '{{tableName}}'",
  "[{{action}}] index '{{indexName}}' on table '{{tableName}}' in schema '{{schemaName}}'",
  // whole index add/remove: kind word (`index` / `unique index`) + key columns
  "[{{action}}] {{indexKind}} '{{indexName}}' on {{columnsClause}} of table '{{tableName}}'",
  "[{{action}}] {{indexKind}} '{{indexName}}' on {{columnsClause}} of table '{{tableName}}' in schema '{{schemaName}}'",
  // unique flag flip (name only + from/to)
  "[{{action}}] index '{{indexName}}' on table '{{tableName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] index '{{indexName}}' on table '{{tableName}}' in schema '{{schemaName}}' from '{{oldValue}}' to '{{newValue}}'",
  // a key part (column / expression) added to or removed from an existing index
  "[{{action}}] {{partClause}} {{preposition}} index '{{indexName}}' of table '{{tableName}}'",
  "[{{action}}] {{partClause}} {{preposition}} index '{{indexName}}' of table '{{tableName}}' in schema '{{schemaName}}'",
  // a key part reordered (1-based position change)
  "[{{action}}] position of {{partClause}} in index '{{indexName}}' of table '{{tableName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] position of {{partClause}} in index '{{indexName}}' of table '{{tableName}}' in schema '{{schemaName}}' from '{{oldValue}}' to '{{newValue}}'",
]

// Add/remove carry the full identity via precomposed local/ref clauses (each clause bakes in its
// own `in schema` suffix when its table is not in the default schema). A referential-action
// change (onDelete/onUpdate) is name-only with from/to (Principle B).
export const FOREIGN_KEY_TEMPLATES = [
  "[{{action}}] foreign key '{{fkName}}' {{localClause}} {{refClause}}",
  "[{{action}}] {{fkAction}} of foreign key '{{fkName}}' on table '{{tableName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] {{fkAction}} of foreign key '{{fkName}}' on table '{{tableName}}' in schema '{{schemaName}}' from '{{oldValue}}' to '{{newValue}}'",
]

// Add/remove carry the (truncated) check expression inline; a change to the expression uses the
// `expression of check … from/to` variant. Plain rows are a name-only fallback.
export const CHECK_TEMPLATES = [
  "[{{action}}] check '{{checkName}}' on table '{{tableName}}'",
  "[{{action}}] check '{{checkName}}' on table '{{tableName}}' in schema '{{schemaName}}'",
  "[{{action}}] check '{{checkName}}' on table '{{tableName}}' with expression '{{value}}'",
  "[{{action}}] check '{{checkName}}' on table '{{tableName}}' in schema '{{schemaName}}' with expression '{{value}}'",
  "[{{action}}] expression of check '{{checkName}}' on table '{{tableName}}' from '{{oldValue}}' to '{{newValue}}'",
  "[{{action}}] expression of check '{{checkName}}' on table '{{tableName}}' in schema '{{schemaName}}' from '{{oldValue}}' to '{{newValue}}'",
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

// Rendered as the SQL keywords themselves (the facet word is `constraint`).
const renderNullability = (value: unknown): string | undefined => {
  if (value === true) { return 'NULL' }
  if (value === false) { return 'NOT NULL' }
  return undefined
}

const nameOf = (node: unknown, property: PropertyKey = DdlapiProperties.Name): PrimitiveType | undefined => {
  return isObject(node) ? checkPrimitiveType(node[property]) : undefined
}

// Free-text values (comment text, check/generated/default expressions) are cut to a fixed length
// with an ellipsis so a long value cannot bloat a description. Non-strings pass through.
const truncate = (value: PrimitiveType | undefined): PrimitiveType | undefined => {
  if (typeof value !== 'string' || value.length <= DESCRIPTION_VALUE_MAX_LENGTH) { return value }
  return `${value.slice(0, DESCRIPTION_VALUE_MAX_LENGTH)}…`
}

// Text of an Expr node (RawExpr.expr / Literal.value), truncated. Used for a default add/remove
// and for an expression index part.
const renderExprText = (exprNode: unknown): PrimitiveType | undefined => {
  if (!isObject(exprNode)) { return undefined }
  return truncate(checkPrimitiveType(exprNode[DdlapiProperties.Expr]) ?? checkPrimitiveType(exprNode[DdlapiProperties.Value]))
}

// `seqNo` is 0-based in the model; render index-part positions 1-based.
const oneBased = (value: unknown): PrimitiveType | undefined => {
  const seqNo = checkPrimitiveType(value)
  return typeof seqNo === 'number' ? seqNo + 1 : undefined
}

const renderUnique = (value: unknown): string | undefined => {
  if (value === true) { return 'UNIQUE' }
  if (value === false) { return 'NON-UNIQUE' }
  return undefined
}

const quoteJoin = (names: ReadonlyArray<PrimitiveType>): string => names.map(name => `'${name}'`).join(', ')
const columnNoun = (count: number): string => (count === 1 ? 'column' : 'columns')

// Bare label of one index part: a column name, or (expression part) its expression text.
const partLabel = (part: unknown): PrimitiveType | undefined => {
  const columnName = nameOf(isObject(part) ? part[DdlapiProperties.Column] : undefined)
  return columnName ?? renderExprText(isObject(part) ? part[DdlapiProperties.Expr] : undefined)
}

// `column 'a'` / `columns 'a', 'b'` for an index or primary key's key parts.
const renderColumnsClause = (indexNode: unknown): string | undefined => {
  const parts = isObject(indexNode) ? indexNode[DdlapiProperties.Parts] : undefined
  if (!isArray(parts)) { return undefined }
  const labels = parts.map(partLabel).filter((label): label is PrimitiveType => label !== undefined)
  return labels.length === 0 ? undefined : `${columnNoun(labels.length)} ${quoteJoin(labels)}`
}

// `column 'b'` / `expression 'lower(a)'` for a single part add / remove / reorder.
const renderPartClause = (part: unknown): string | undefined => {
  const columnName = nameOf(isObject(part) ? part[DdlapiProperties.Column] : undefined)
  if (columnName !== undefined) { return `column '${columnName}'` }
  const expr = renderExprText(isObject(part) ? part[DdlapiProperties.Expr] : undefined)
  return expr === undefined ? undefined : `expression '${expr}'`
}

const columnNames = (node: unknown, property: PropertyKey): PrimitiveType[] => {
  const columns = isObject(node) ? node[property] : undefined
  return isArray(columns) ? columns.map(column => nameOf(column)).filter((name): name is PrimitiveType => name !== undefined) : []
}

// A Table node has no back-reference to its schema; locate the owning schema by identity. After a
// build/normalization `foreignKey.refTable` is the exact `Table` instance held in `schema.tables`
// (the shared-instance contract), so an `===` scan resolves the referenced table's schema name.
const schemaNameOfTableNode = (root: unknown, tableNode: unknown): PrimitiveType | undefined => {
  if (!isObject(tableNode)) { return undefined }
  const schemas = getKeyValue(root, DdlapiProperties.Schemas)
  if (!isArray(schemas)) { return undefined }
  for (const schema of schemas) {
    const tables = isObject(schema) ? schema[DdlapiProperties.Tables] : undefined
    if (isArray(tables) && tables.some(table => table === tableNode)) { return nameOf(schema) }
  }
  return undefined
}

// `beforeValue`/`afterValue` live on specific Diff union members; read them safely.
const beforeValueOf = (diff: Diff): unknown => (isDiffAdd(diff) ? undefined : (diff as { beforeValue?: unknown }).beforeValue)
const afterValueOf = (diff: Diff): unknown => (isDiffRemove(diff) ? undefined : (diff as { afterValue?: unknown }).afterValue)

// Declaration paths with the side matching the resolution root first (after for add/replace,
// before for remove); a replace lists after before before so positional reorders resolve the
// part on the root side.
const orderedDeclarationPaths = (diff: Diff): JsonPath[] => {
  switch (diff.action) {
    case DiffAction.add: return [...diff.afterDeclarationPaths]
    case DiffAction.remove: return [...diff.beforeDeclarationPaths]
    case DiffAction.replace: return [...diff.afterDeclarationPaths, ...diff.beforeDeclarationPaths]
    case DiffAction.rename: return [...(diff.afterDeclarationPaths ?? diff.beforeDeclarationPaths)]
    default: return []
  }
}

const SCHEMA_DEPTH = 2 // ['schemas', si]
const TABLE_DEPTH = 4 // ['schemas', si, 'tables', ti]
const COLUMN_DEPTH = 6 // ['schemas', si, 'tables', ti, 'columns', ci]
const ENUM_DEPTH = 4 // ['schemas', si, 'objects', oi]

// Column-level value attrs that render as a column facet (the attr `kind` → facet word).
const COLUMN_ATTR_FACETS: Record<string, string> = {
  [AttrKind.Collation]: FACET_COLLATION,
  [AttrKind.GeneratedExpr]: FACET_GENERATED,
}

/**
 * Single descriptionParamCalculator for the ddlapi rules. Classifies the change by the tail
 * of its declaration path, then resolves entity names by slicing that canonical declaration
 * path against the diff side's realm root (robust for shared nodes — a shared enum/column is
 * resolved from its own origin, not the crawl route that reached it). Old/new values come
 * from the diff. The `in schema` clause is dropped for the dialect default schema by omitting
 * `schemaName` so the shorter template wins.
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
    // Candidate declaration paths, sliced against the realm on the side that carries the change —
    // after for add/replace, before for remove. The root-matching side is tried first: this makes
    // a positional reorder (an index part's `seqNo` replace, whose part index differs between the
    // before and after sides) resolve the part on the same side as `root`. A replace whose after
    // value is a normalized default (e.g. an index `unique:false`) yields a synthetic `#defaults`
    // after-path; it never matches the structural predicates below, so the real (before) path is
    // selected instead — and for a value/leaf replace the ancestors are identical on both sides,
    // so slicing a before-origin path against the after realm resolves the same entity.
    const root = (isDiffRemove(diff) ? ctx.before : ctx.after).root
    const sidePaths = orderedDeclarationPaths(diff)
    if (sidePaths.length === 0) { return FAILED_PARAMS_CALCULATION }

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
        [TEMPLATE_PARAM_OLD_VALUE]: truncate(checkPrimitiveType(beforeValueOf(diff))),
        [TEMPLATE_PARAM_NEW_VALUE]: truncate(checkPrimitiveType(afterValueOf(diff))),
      }
    }

    // column default add/remove — the whole Expr node; render its text inline as the value.
    const defaultPath = pathWhere(p => p[p.length - 1] === DdlapiProperties.Default)
    if (defaultPath) {
      return {
        ...base,
        [TEMPLATE_PARAM_FACET]: FACET_DEFAULT,
        [TEMPLATE_PARAM_VALUE]: renderExprText(nodeAt(defaultPath, defaultPath.length)),
        [TEMPLATE_PARAM_COLUMN_NAME]: nameOf(nodeAt(defaultPath, COLUMN_DEPTH)),
        [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(defaultPath, TABLE_DEPTH)),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, defaultPath),
      }
    }

    // primary key — whole add/remove lists its key columns; a sub-change (part reorder) falls
    // back to the name-only variant (no columnsClause supplied).
    const pkPath = pathWhere(p => p.includes(DdlapiProperties.PrimaryKey))
    if (pkPath) {
      const pkIdx = pkPath.indexOf(DdlapiProperties.PrimaryKey)
      const wholePk = pkPath[pkPath.length - 1] === DdlapiProperties.PrimaryKey
      return {
        ...base,
        ...(wholePk ? { [TEMPLATE_PARAM_COLUMNS_CLAUSE]: renderColumnsClause(nodeAt(pkPath, pkIdx + 1)) } : {}),
        [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(pkPath, TABLE_DEPTH)),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, pkPath),
      }
    }

    // index — whole add/remove (kind word + key columns), a key part add/remove, a part reorder
    // (1-based position), or a unique-flag flip. The classifier picks one by the path tail.
    const indexPath = pathWhere(p => p.includes(DdlapiProperties.Indexes))
    if (indexPath) {
      const indexIdx = indexPath.indexOf(DdlapiProperties.Indexes)
      const indexNode = nodeAt(indexPath, indexIdx + 2)
      const partsIdx = indexPath.indexOf(DdlapiProperties.Parts)
      const last = indexPath[indexPath.length - 1]
      const common = {
        ...base,
        [TEMPLATE_PARAM_INDEX_NAME]: nameOf(indexNode),
        [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(indexPath, TABLE_DEPTH)),
        [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, indexPath),
      }
      if (partsIdx >= 0 && last === DdlapiProperties.SeqNo) {
        // part reorder — `seqNo` is 0-based in the model, rendered 1-based.
        return {
          ...common,
          [TEMPLATE_PARAM_PART_CLAUSE]: renderPartClause(nodeAt(indexPath, partsIdx + 2)),
          [TEMPLATE_PARAM_OLD_VALUE]: oneBased(beforeValueOf(diff)),
          [TEMPLATE_PARAM_NEW_VALUE]: oneBased(afterValueOf(diff)),
        }
      }
      if (last === DdlapiProperties.Unique) {
        return {
          ...common,
          [TEMPLATE_PARAM_OLD_VALUE]: renderUnique(beforeValueOf(diff)),
          [TEMPLATE_PARAM_NEW_VALUE]: renderUnique(afterValueOf(diff)),
        }
      }
      if (lastSegments(indexPath)[0] === DdlapiProperties.Parts && typeof last === 'number') {
        // a key part (column / expression) added to or removed from an existing index
        return { ...common, [TEMPLATE_PARAM_PART_CLAUSE]: renderPartClause(nodeAt(indexPath, partsIdx + 2)) }
      }
      // whole index add/remove (and any unrecognised index change → name-only fallback)
      return {
        ...common,
        [TEMPLATE_PARAM_INDEX_KIND]: isObject(indexNode) && indexNode[DdlapiProperties.Unique] === true ? 'unique index' : 'index',
        [TEMPLATE_PARAM_COLUMNS_CLAUSE]: renderColumnsClause(indexNode),
      }
    }

    // foreign key — add/remove (and any non referential-action change) renders the full identity
    // via local/ref clauses; an onDelete/onUpdate change is name-only with from/to.
    const fkPath = pathWhere(p => p.includes(DdlapiProperties.ForeignKeys))
    if (fkPath) {
      const fkIdx = fkPath.indexOf(DdlapiProperties.ForeignKeys)
      const fkNode = nodeAt(fkPath, fkIdx + 2)
      const fkName = nameOf(fkNode, DdlapiProperties.Symbol) ?? nameOf(fkNode)
      const last = fkPath[fkPath.length - 1]
      if (last === DdlapiProperties.OnDelete || last === DdlapiProperties.OnUpdate) {
        return {
          ...base,
          [TEMPLATE_PARAM_FK_NAME]: fkName,
          [TEMPLATE_PARAM_FK_ACTION]: last === DdlapiProperties.OnDelete ? 'on-delete action' : 'on-update action',
          [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(fkPath, TABLE_DEPTH)),
          [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, fkPath),
          [TEMPLATE_PARAM_OLD_VALUE]: checkPrimitiveType(beforeValueOf(diff)),
          [TEMPLATE_PARAM_NEW_VALUE]: checkPrimitiveType(afterValueOf(diff)),
        }
      }
      const localColumns = columnNames(fkNode, DdlapiProperties.Columns)
      const localTable = nameOf(nodeAt(fkPath, TABLE_DEPTH))
      const localSchema = schemaParam(root, fkPath)
      const refTable = isObject(fkNode) ? fkNode[DdlapiProperties.RefTable] : undefined
      const refColumns = columnNames(fkNode, DdlapiProperties.RefColumns)
      const refSchemaName = schemaNameOfTableNode(root, refTable)
      const refSchema = refSchemaName === dialect.defaultSchemaName ? undefined : refSchemaName
      return {
        ...base,
        [TEMPLATE_PARAM_FK_NAME]: fkName,
        [TEMPLATE_PARAM_LOCAL_CLAUSE]: `on ${columnNoun(localColumns.length)} ${quoteJoin(localColumns)} of table '${localTable}'${localSchema ? ` in schema '${localSchema}'` : ''}`,
        [TEMPLATE_PARAM_REF_CLAUSE]: `referencing ${columnNoun(refColumns.length)} ${quoteJoin(refColumns)} of table '${nameOf(refTable)}'${refSchema ? ` in schema '${refSchema}'` : ''}`,
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
      // A scalar leaf change inside the attr (Comment.text, Collation.value,
      // GeneratedExpr.expr) carries before/after directly on the diff.
      const lastSegment = memberPath[memberPath.length - 1]
      const leafChange = lastSegment === DdlapiProperties.Text ||
        lastSegment === DdlapiProperties.Value ||
        lastSegment === DdlapiProperties.Expr
      // A leaf change carries truncated from/to; an add/remove carries the (truncated) value
      // inline. Exactly one of the two sets is supplied so suitability picks the right variant.
      const oldNew = leafChange
        ? {
          [TEMPLATE_PARAM_OLD_VALUE]: truncate(checkPrimitiveType(beforeValueOf(diff))),
          [TEMPLATE_PARAM_NEW_VALUE]: truncate(checkPrimitiveType(afterValueOf(diff))),
        }
        : {}
      const valueParam = (property: PropertyKey): DynamicParams => {
        return leafChange ? {} : { [TEMPLATE_PARAM_VALUE]: truncate(nameOf(member, property)) }
      }

      // Check — same classify/describe whether it lives in attrs[] or objects[]. The
      // expression is carried inline on add/remove and as from/to on a change.
      if (kind === AttrKind.Check) {
        return {
          ...base,
          ...oldNew,
          ...valueParam(DdlapiProperties.Expr),
          [TEMPLATE_PARAM_CHECK_NAME]: nameOf(member),
          [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(memberPath, TABLE_DEPTH)),
          [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, memberPath),
        }
      }

      // Collation / generated expression — column-level value attrs (column facet). The attr's
      // value (Collation.value / GeneratedExpr.expr) is carried inline on add/remove.
      const columnAttrFacet = typeof kind === 'string' ? COLUMN_ATTR_FACETS[kind] : undefined
      if (columnAttrFacet) {
        return {
          ...base,
          ...oldNew,
          ...valueParam(kind === AttrKind.GeneratedExpr ? DdlapiProperties.Expr : DdlapiProperties.Value),
          [TEMPLATE_PARAM_FACET]: columnAttrFacet,
          [TEMPLATE_PARAM_COLUMN_NAME]: nameOf(nodeAt(memberPath, COLUMN_DEPTH)),
          [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(memberPath, TABLE_DEPTH)),
          [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, memberPath),
        }
      }

      // Comment — description at schema / table / column level. The (truncated) text is
      // carried inline on add/remove and as from/to on a change.
      if (kind === AttrKind.Comment) {
        const text = valueParam(DdlapiProperties.Text)
        if (level === DdlapiProperties.Schemas) {
          // schema is the subject here — keep its name even when it is the default schema.
          return { ...base, ...oldNew, ...text, [TEMPLATE_PARAM_SCHEMA_NAME]: nameOf(nodeAt(memberPath, SCHEMA_DEPTH)) }
        }
        if (level === DdlapiProperties.Tables) {
          return {
            ...base,
            ...oldNew,
            ...text,
            [TEMPLATE_PARAM_TABLE_NAME]: nameOf(nodeAt(memberPath, TABLE_DEPTH)),
            [TEMPLATE_PARAM_SCHEMA_NAME]: schemaParam(root, memberPath),
          }
        }
        if (level === DdlapiProperties.Columns) {
          return {
            ...base,
            ...oldNew,
            ...text,
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
