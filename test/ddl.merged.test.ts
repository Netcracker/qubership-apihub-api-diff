import { ClassifierType, DiffAction } from '../src'
import { diffSql } from './helper/ddl'

// Shared diff-instance & merged-document contract (plan §8A, test area 9). When one logical
// entity is referenced from several places, the change to it must be the SAME Diff instance
// at every reference site in `merged`, and appear once in `diffs`.

type Any = Record<string, any>
const tablesOf = (merged: unknown): Any[] => (merged as Any).schemas[0].tables
const findTable = (merged: unknown, name: string): Any => tablesOf(merged).find(t => t.name === name)!
const findColumn = (table: Any, name: string): Any => table.columns.find((c: Any) => c.name === name)!
const objectsOf = (merged: unknown): Any[] => (merged as Any).schemas[0].objects ?? []

describe('shared-instance / merged-document contract (T2.6)', () => {
  it('an enum used by several columns: value change ⇒ one shared diff at every column', async () => {
    const { diffs, merged } = await diffSql(
      "create type mood as enum ('a'); create table t(m1 mood, m2 mood);",
      "create type mood as enum ('a','b'); create table t(m1 mood, m2 mood);",
    )

    // Exactly one value-add diff, non-breaking (E1).
    expect(diffs).toHaveLength(1)
    expect(diffs[0].action).toBe(DiffAction.add)
    expect(diffs[0].type).toBe(ClassifierType.nonBreaking)

    // The enum is one shared instance in merged: reached via either column and via
    // schema.objects, it is the same object reference.
    const t = findTable(merged, 't')
    const enumViaM1 = findColumn(t, 'm1').type.type
    const enumViaM2 = findColumn(t, 'm2').type.type
    expect(enumViaM1).toBe(enumViaM2)

    const enumObject = objectsOf(merged).find(o => o.kind === 'EnumType')
    if (enumObject) {
      expect(enumViaM1).toBe(enumObject)
    }
  })

  it('a column in a primary key and a foreign key: type change ⇒ one shared diff at every site', async () => {
    const { diffs, merged } = await diffSql(
      'create table t(id int, primary key (id)); create table u(uid int, ref int, constraint fk_u foreign key (ref) references t(id));',
      'create table t(id bigint, primary key (id)); create table u(uid int, ref int, constraint fk_u foreign key (ref) references t(id));',
    )

    // One type-change diff (same family int→bigint → non-breaking), shared across sites.
    expect(diffs).toHaveLength(1)
    expect(diffs[0].action).toBe(DiffAction.replace)
    expect(diffs[0].type).toBe(ClassifierType.nonBreaking)

    const t = findTable(merged, 't')
    const idColumn = findColumn(t, 'id')

    // primaryKey part references the very same Column instance.
    expect(t.primaryKey.parts[0].column).toBe(idColumn)

    // fk.refTable is the same Table instance; fk.refColumns[0] is the same Column instance.
    const u = findTable(merged, 'u')
    const fk = u.foreignKeys[0]
    expect(fk.refTable).toBe(t)
    expect(fk.refColumns[0]).toBe(idColumn)
  })
})
