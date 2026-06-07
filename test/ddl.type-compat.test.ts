import { TypeKind } from '@netcracker/qubership-apihub-ddlapi'
import { consumptionFamily, sameConsumptionFamily } from '../src/ddl/ddl.classify'
import { DIALECT_DIFF_POSTGRES } from '../src/ddl'

// Pure-function tests for the SQL type-compatibility model (plan §7, test area 2). No engine.

const type = (kind: string, sqlType = 'x') => ({ kind, type: sqlType })
const family = (kind: string) => consumptionFamily(type(kind), DIALECT_DIFF_POSTGRES)
const same = (a: string, b: string) =>
  sameConsumptionFamily(type(a), type(b), DIALECT_DIFF_POSTGRES)

describe('consumptionFamily (core kinds)', () => {
  it('maps each core kind to its family', () => {
    expect(family(TypeKind.BoolType)).toBe('boolean')
    expect(family(TypeKind.IntegerType)).toBe('numeric')
    expect(family(TypeKind.DecimalType)).toBe('numeric')
    expect(family(TypeKind.FloatType)).toBe('numeric')
    expect(family(TypeKind.StringType)).toBe('textual')
    expect(family(TypeKind.BinaryType)).toBe('binary')
    expect(family(TypeKind.TimeType)).toBe('temporal')
    expect(family(TypeKind.JSONType)).toBe('json')
    expect(family(TypeKind.UUIDType)).toBe('uuid')
    expect(family(TypeKind.EnumType)).toBe('enum')
  })

  it('maps Spatial / Unsupported / unknown kinds to opaque', () => {
    expect(family(TypeKind.SpatialType)).toBe('opaque')
    expect(family(TypeKind.UnsupportedType)).toBe('opaque')
    expect(family('SomePgEscapeHatchType')).toBe('opaque')
  })
})

describe('sameConsumptionFamily', () => {
  it('intra-family ⇒ true (non-breaking)', () => {
    // numeric: smallint→integer→bigint, float→decimal
    expect(same(TypeKind.IntegerType, TypeKind.IntegerType)).toBe(true)
    expect(same(TypeKind.IntegerType, TypeKind.DecimalType)).toBe(true)
    expect(same(TypeKind.FloatType, TypeKind.DecimalType)).toBe(true)
    // textual / temporal
    expect(same(TypeKind.StringType, TypeKind.StringType)).toBe(true)
    expect(same(TypeKind.TimeType, TypeKind.TimeType)).toBe(true)
  })

  it('cross-family ⇒ false (breaking)', () => {
    expect(same(TypeKind.IntegerType, TypeKind.StringType)).toBe(false)
    expect(same(TypeKind.TimeType, TypeKind.StringType)).toBe(false)
    expect(same(TypeKind.IntegerType, TypeKind.BoolType)).toBe(false)
    expect(same(TypeKind.EnumType, TypeKind.StringType)).toBe(false)
  })

  it('opaque on either side ⇒ false (conservative breaking)', () => {
    expect(same(TypeKind.UnsupportedType, TypeKind.UnsupportedType)).toBe(false)
    expect(same(TypeKind.IntegerType, TypeKind.UnsupportedType)).toBe(false)
    expect(same(TypeKind.SpatialType, TypeKind.SpatialType)).toBe(false)
  })
})
