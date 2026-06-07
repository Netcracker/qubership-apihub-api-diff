import { deepEqual } from 'fast-equals'
import {
  addNonBreaking,
  allNonBreaking,
  breaking,
  breakingIf,
  createDiffEntry,
  diffFactory,
} from '../core'
import { ClassifyRule, CompareResolver, DiffTypeClassifier } from '../types'
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
 * The `replace` slot compares the two `SchemaType`s by consumption family: same family →
 * non-breaking (every operation stays type-valid); cross-family → breaking (an operation
 * that was type-valid no longer is). add/remove of a whole type node (not normally reached
 * for a mapped column) is conservatively breaking.
 */
export const createColumnTypeClassifier = (dialect: DdlDiffDialect): ClassifyRule => {
  const replace: DiffTypeClassifier = ({ before, after }) =>
    breakingIf(!sameConsumptionFamily(before.value, after.value, dialect))
  return [breaking, breaking, replace]
}

/**
 * Collapses a `SchemaType` change into a single `replace` diff (classified by family via the
 * node's `$`), instead of letting the engine descend and emit one diff per inner field
 * (e.g. `varchar(50)→text` would otherwise be a `/type` + `/size` pair). Two cases fall
 * through to the default engine descent (return `undefined`):
 *  - both sides are enums → descend so EnumType.values[] yields E1/E2 element diffs;
 *  - structurally equal types → descend, find nothing, emit nothing.
 * Never clones the node (merged = the after instance), preserving the shared-instance
 * contract for a shared enum (plan §8A).
 */
export const schemaTypeCompareResolver: CompareResolver = (ctx) => {
  const beforeType = ctx.before.value
  const afterType = ctx.after.value
  if (!isObject(beforeType) || !isObject(afterType)) {
    return undefined // add/remove of the whole type node is decided by the parent
  }
  if (readKind(beforeType) === TypeKind.EnumType && readKind(afterType) === TypeKind.EnumType) {
    return undefined // descend → EnumType.values[] (E1/E2)
  }
  if (deepEqual(beforeType, afterType)) {
    return undefined // identical → engine descends and finds nothing
  }
  const diffEntry = createDiffEntry(ctx, diffFactory.replaced(ctx))
  return { diffs: [diffEntry.diff], ownerDiffEntry: diffEntry, merged: afterType }
}
