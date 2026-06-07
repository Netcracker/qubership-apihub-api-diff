import { addNonBreaking, allNonBreaking, breaking, breakingIf, nonBreaking } from '../core'
import { ClassifyRule, DiffTypeClassifier } from '../types'
import { isObject } from '../utils'
import { TypeKind } from './ddl.const'
import { DdlDiffDialect, TypeConsumptionFamily } from './ddl.dialect'

const readKind = (value: unknown): string | undefined => {
  return isObject(value) && typeof value.kind === 'string' ? value.kind : undefined
}

// --- structural add/remove classifiers (cases 1–4) ---
// Adding a table/column never breaks an existing query; deleting one makes a previously
// valid SELECT fail to resolve (plan §6). add→nonBreaking, remove/replace→breaking.
export const tableClassifier: ClassifyRule = addNonBreaking
export const columnClassifier: ClassifyRule = addNonBreaking

// --- nullability (cases 6, 7) ---
// A nullability change never makes a SELECT fail to execute, in either direction (§1/D15).
export const nullabilityClassifier: ClassifyRule = allNonBreaking

// --- enum values (E1, E2) ---
// The allowed-value set is a write constraint; no SELECT fails when a value is added or
// removed (a removed category simply stops appearing) — both non-breaking (§6/D6).
export const enumValueClassifier: ClassifyRule = allNonBreaking

// --- column type change (case 5) ---

/**
 * Maps a `SchemaType` to how a dashboard consumes its values (plan §7). Core, closed kinds
 * are classified here; escape-hatch kinds defer to the dialect, falling back to `opaque`.
 */
export const consumptionFamily = (schemaType: unknown, dialect: DdlDiffDialect): TypeConsumptionFamily => {
  switch (readKind(schemaType)) {
    case TypeKind.BoolType:
      return 'boolean'
    case TypeKind.IntegerType:
    case TypeKind.DecimalType:
    case TypeKind.FloatType:
      return 'numeric'
    case TypeKind.StringType:
      return 'textual'
    case TypeKind.BinaryType:
      return 'binary'
    case TypeKind.TimeType:
      return 'temporal'
    case TypeKind.JSONType:
      return 'json'
    case TypeKind.UUIDType:
      return 'uuid'
    case TypeKind.EnumType:
      return 'enum'
    default:
      // SpatialType / UnsupportedType / dialect escape-hatch / undecidable → opaque.
      return dialect.typeFamilyFor?.(schemaType) ?? 'opaque'
  }
}

/**
 * `true` iff old→new keeps every type-valid operation valid: same family and not `opaque`.
 * `opaque` on either side (or family undecidable) ⇒ `false` (conservative breaking, §7).
 */
export const sameConsumptionFamily = (before: unknown, after: unknown, dialect: DdlDiffDialect): boolean => {
  const beforeFamily = consumptionFamily(before, dialect)
  const afterFamily = consumptionFamily(after, dialect)
  return beforeFamily === afterFamily && beforeFamily !== 'opaque'
}

/**
 * Classifier for the `SchemaType` **`/type` name** field (`column.type.type.type`). The engine
 * descends into the SchemaType and reports a diff per changed property; the cross-family
 * breaking signal rides on the canonical type-name change, because `/kind` is suppressed and
 * a cross-family change always changes the name. The verdict is computed from the **immediate
 * parent** SchemaType on each side (available on both sides for a name replace):
 * same family → non-breaking; cross family (or opaque) → breaking. Within-kind size/precision/
 * scale changes carry no family change and are non-breaking (classified `allNonBreaking`, O1).
 */
export const createTypeNameClassifier = (dialect: DdlDiffDialect): ClassifyRule => {
  const replaceClassifier: DiffTypeClassifier = (ctx) =>
    breakingIf(!sameConsumptionFamily(ctx.before.parentContext?.value, ctx.after.parentContext?.value, dialect))
  return [nonBreaking, breaking, replaceClassifier]
}
