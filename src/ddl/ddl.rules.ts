import { CrawlRulesContext, isObject } from '@netcracker/qubership-apihub-json-crawl'
import { allAnnotation, allNonBreaking, allUnclassified } from '../core'
import {
  CompareMode,
  CompareRule,
  CompareRules,
  IGNORE_DIFFERENCE_IN_KEYS_RULE,
  IGNORE_DIFFERENCE_RULE,
} from '../types'
import {
  AttrKind,
  DdlApiSpecVersion,
  ExprKind,
  ObjectKind,
  TypeKind,
} from './ddl.const'
import { DdlDiffDialect } from './ddl.dialect'
import {
  columnClassifier,
  createTypeNameClassifier,
  enumValueClassifier,
  nullabilityClassifier,
  tableClassifier,
} from './ddl.classify'
import {
  attrsMappingResolver,
  enumValuesMappingResolver,
  indexPartMappingResolver,
  nameMappingResolver,
  symbolMappingResolver,
} from './ddl.mapping'
import {
  checkDescription,
  columnDescription,
  columnFacetDescription,
  commentDescription,
  createDdlParamsCalculator,
  enumValueDescription,
  foreignKeyDescription,
  indexDescription,
  tableDescription,
} from './ddl.description'

export interface DdlRulesOptions {
  mode: CompareMode
  version: DdlApiSpecVersion
}

const readKind = (value: unknown): string | undefined => {
  return isObject(value) && 'kind' in value && typeof value.kind === 'string'
    ? value.kind
    : undefined
}

// `kind` is a technical discriminant with no domain meaning, and `column.type.raw` is
// redundant with `column.type.type` (plan §7/§9b) — both are suppressed in place
// (whole node, all actions) so an end user never sees "changed kind/raw from X to Y".
const SUPPRESS: CompareRule = { [IGNORE_DIFFERENCE_RULE]: true }

// ddlapi arrays are identity-keyed (plan §8), so an element matched to a different index is a
// reorder, not a rename. `ignoreKeyDifference` on the element stops that index change being
// reported as a `[Renamed]` diff. Applied to every mapped-array element.
const asElement = (rules: CompareRules): CompareRules => ({
  ...rules as object,
  [IGNORE_DIFFERENCE_IN_KEYS_RULE]: true,
})

/**
 * Core, driver-neutral ddlapi diff rules. Mirrors api-unifier's `ddlApiRules` shape
 * (Realm → schemas → tables → columns/indexes/foreignKeys/attrs/objects) so the two
 * libraries stay aligned. Union `kind`s the core does not recognise are delegated to
 * `dialect.*RulesFor(kind)`; a dialect miss falls back to the single root-level
 * `unclassified` catch-all (`/**` → `$: allUnclassified`, plan §5/O3).
 *
 * All node rules are declared inside this closure so they capture `dialect`; the union
 * dispatchers and the cyclic `fk.refTable` edge are resolved lazily at crawl time.
 */
export const ddlRules = (_options: DdlRulesOptions, dialect: DdlDiffDialect): CompareRules => {
  const typeNameClassifier = createTypeNameClassifier(dialect)
  const descriptionParamCalculator = createDdlParamsCalculator(dialect)

  // --- union kind-dispatchers (lazy; default branch → dialect lookup → fall through) ---

  const schemaTypeRules = ({ value }: CrawlRulesContext): CompareRules => {
    const kind = readKind(value)
    switch (kind) {
      case TypeKind.BoolType:
      case TypeKind.JSONType:
      case TypeKind.SpatialType:
      case TypeKind.UUIDType:
      case TypeKind.UnsupportedType:
      case TypeKind.IntegerType:
      case TypeKind.DecimalType:
      case TypeKind.FloatType:
      case TypeKind.StringType:
      case TypeKind.BinaryType:
      case TypeKind.TimeType:
        return scalarTypeRules
      case TypeKind.EnumType:
        return enumTypeRules
      default:
        return (kind !== undefined ? dialect.typeRulesFor(kind) : undefined) ?? {}
    }
  }

  const attrRules = (ctx: CrawlRulesContext): CompareRules => asElement(resolveAttrRules(ctx))
  const resolveAttrRules = ({ value }: CrawlRulesContext): CompareRules => {
    const kind = readKind(value)
    switch (kind) {
      case AttrKind.Comment: return commentRules
      case AttrKind.Charset: return charsetRules
      case AttrKind.Collation: return collationRules
      case AttrKind.Check: return checkRules
      case AttrKind.GeneratedExpr: return generatedExprRules
      default:
        return (kind !== undefined ? dialect.attrRulesFor(kind) : undefined) ?? {}
    }
  }

  const exprRules = ({ value }: CrawlRulesContext): CompareRules => {
    const kind = readKind(value)
    switch (kind) {
      case ExprKind.Literal: return literalRules
      case ExprKind.RawExpr: return rawExprRules
      case ObjectKind.NamedDefault: return namedDefaultRules
      default:
        return {}
    }
  }

  const objectRules = (ctx: CrawlRulesContext): CompareRules => asElement(resolveObjectRules(ctx))
  const resolveObjectRules = ({ value }: CrawlRulesContext): CompareRules => {
    const kind = readKind(value)
    switch (kind) {
      case ObjectKind.Table: return tableRules
      case ObjectKind.Index: return indexRules
      case ObjectKind.ForeignKey: return foreignKeyRules
      case ObjectKind.Check: return checkRules
      case ObjectKind.NamedDefault: return namedDefaultRules
      case ObjectKind.EnumType: return enumTypeRules
      default:
        return (kind !== undefined ? dialect.objectRulesFor(kind) : undefined) ?? {}
    }
  }

  // --- collection rules (identity-keyed; plan §8) ---
  const attrsArrayRule: CompareRules = { mapping: attrsMappingResolver, '/*': attrRules }
  const objectsArrayRule: CompareRules = { mapping: attrsMappingResolver, '/*': objectRules }

  // --- SchemaType members ---
  // The engine descends into the SchemaType and reports a diff per changed property. The
  // cross-family breaking signal rides on the `/type` name (kind is suppressed; a cross-family
  // change always changes the canonical name). Within-kind size/precision/scale changes are
  // non-breaking (O1). `/unsigned` is a PG-irrelevant MySQL-ism (always false) → suppressed.
  const typeFieldRules: CompareRules = {
    '/kind': SUPPRESS,
    '/unsigned': SUPPRESS,
    '/type': { $: typeNameClassifier, description: columnFacetDescription }, // facet = type
    '/size': { $: allNonBreaking, description: columnFacetDescription },
    '/precision': { $: allNonBreaking, description: columnFacetDescription },
    '/scale': { $: allNonBreaking, description: columnFacetDescription },
  }
  const scalarTypeRules: CompareRules = typeFieldRules
  const enumTypeRules: CompareRules = {
    ...typeFieldRules,
    '/values': {
      mapping: enumValuesMappingResolver,
      // set semantics — a reorder maps a value to a new index; ignoreKeyDifference (on the
      // element) stops that index change being reported as a rename.
      '/*': {
        $: enumValueClassifier,
        [IGNORE_DIFFERENCE_IN_KEYS_RULE]: true,
        description: enumValueDescription,
      },
    },
    '/attrs': attrsArrayRule,
  }

  // --- Attr members ---
  // A Comment attr is a column/table/schema description (COMMENT ON …): documentation-only →
  // annotation, at the attr node (add/remove) and its text leaf (change).
  const commentRules: CompareRules = {
    $: allAnnotation,
    description: commentDescription,
    '/kind': SUPPRESS,
    '/text': { $: allAnnotation, description: commentDescription },
  }
  const charsetRules: CompareRules = { '/kind': SUPPRESS }
  const collationRules: CompareRules = { '/kind': SUPPRESS }
  // Check is dual-role (Attr + SchemaObject, one `kind`); this single rule serves both. A
  // check is a write-time constraint invisible to SELECT → add/remove and expr change are
  // non-breaking (T5.3).
  const checkRules: CompareRules = {
    $: allNonBreaking,
    description: checkDescription,
    '/kind': SUPPRESS,
    '/expr': { $: allNonBreaking, description: checkDescription },
    '/attrs': attrsArrayRule,
  }
  const generatedExprRules: CompareRules = { '/kind': SUPPRESS }

  // --- Expr members ---
  // Used for column.default (cases 8-10), index-part expressions, and NamedDefault. A default
  // add/remove/change never makes a SELECT fail → non-breaking. The default facet description
  // is selected by the param calculator only when the diff sits under a `default` path.
  const literalRules: CompareRules = {
    $: allNonBreaking,
    description: columnFacetDescription,
    '/kind': SUPPRESS,
    '/value': { $: allNonBreaking, description: columnFacetDescription },
  }
  const rawExprRules: CompareRules = {
    $: allNonBreaking,
    description: columnFacetDescription,
    '/kind': SUPPRESS,
    '/expr': { $: allNonBreaking, description: columnFacetDescription },
  }
  const namedDefaultRules: CompareRules = {
    $: allNonBreaking,
    description: columnFacetDescription,
    '/kind': SUPPRESS,
    '/expr': exprRules,
    '/attrs': attrsArrayRule,
  }

  // --- Column / ColumnType ---
  const columnTypeRules: CompareRules = {
    '/type': schemaTypeRules,
    '/raw': SUPPRESS, // redundant with /type (plan §7/§9b)
    '/null': { $: nullabilityClassifier, description: columnFacetDescription }, // facet = nullability
  }
  const columnRules: CompareRules = {
    $: columnClassifier,
    description: columnDescription,
    '/type': columnTypeRules,
    '/default': exprRules,
    '/attrs': attrsArrayRule,
  }

  // --- Index / IndexPart ---
  // Indexes are performance-only and primary key/unique alter grain, not query validity →
  // all non-breaking (T5.1/§6/D10). Parts are keyed by referenced column name so a
  // column-order swap surfaces as `seqNo` replace diffs (non-breaking), not add/remove churn.
  const indexPartRules: CompareRules = {
    $: allNonBreaking,
    description: indexDescription,
    '/seqNo': { $: allNonBreaking, description: indexDescription },
    '/expr': exprRules,
    '/column': columnRules, // reference edge to a table column (same instance)
    '/attrs': attrsArrayRule,
  }
  const indexRules: CompareRules = {
    $: allNonBreaking,
    description: indexDescription,
    '/kind': SUPPRESS,
    '/unique': { $: allNonBreaking, description: indexDescription },
    '/attrs': attrsArrayRule,
    '/parts': { mapping: indexPartMappingResolver, '/*': asElement(indexPartRules) },
  }

  // --- ForeignKey ---
  // FK add/remove and onUpdate/onDelete/refColumns changes are write-time constraints
  // invisible to a reader → non-breaking (T5.2/§6). refTable reuses the table rule via a lazy
  // cyclic edge — never cloned (shared-instance contract §8A).
  const foreignKeyRules: CompareRules = {
    $: allNonBreaking,
    description: foreignKeyDescription,
    '/kind': SUPPRESS,
    '/columns': { mapping: nameMappingResolver, '/*': asElement(columnRules) },
    '/refTable': () => tableRules, // lazy cyclic edge to a shared Table instance
    '/refColumns': { mapping: nameMappingResolver, '/*': asElement(columnRules) },
    '/onUpdate': { $: allNonBreaking, description: foreignKeyDescription },
    '/onDelete': { $: allNonBreaking, description: foreignKeyDescription },
    '/attrs': attrsArrayRule,
  }

  // --- Table ---
  const tableRules: CompareRules = {
    $: tableClassifier,
    description: tableDescription,
    '/kind': SUPPRESS,
    '/columns': { mapping: nameMappingResolver, '/*': asElement(columnRules) },
    '/indexes': { mapping: nameMappingResolver, '/*': asElement(indexRules) },
    '/primaryKey': indexRules,
    '/foreignKeys': { mapping: symbolMappingResolver, '/*': asElement(foreignKeyRules) },
    '/attrs': attrsArrayRule,
    '/objects': objectsArrayRule,
  }

  // --- Schema ---
  const schemaRules: CompareRules = {
    '/tables': { mapping: nameMappingResolver, '/*': asElement(tableRules) },
    '/attrs': attrsArrayRule,
    '/objects': objectsArrayRule,
  }

  // --- Realm (root) ---
  return {
    // Nearest descriptionParamCalculator for every node (resolved up the rule tree).
    descriptionParamCalculator,
    // Single root-level catch-all: any node without a more specific rule classifies as
    // `unclassified` (plan §5/O3). `/**` is propagated to descendants by json-crawl.
    '/**': { $: allUnclassified },
    '/schemas': { mapping: nameMappingResolver, '/*': asElement(schemaRules) },
    '/attrs': attrsArrayRule,
    '/objects': objectsArrayRule,
  }
}
