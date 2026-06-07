import { DiffAction } from '../src'
import { diffSql } from './helper/ddl'

// Guards the identity-key mapping resolvers (plan §8). A reorder must not surface as
// spurious add/remove; an add/remove of one element must surface as exactly one diff.

describe('name-keyed resolvers (T2.1)', () => {
  it('reordering tables ⇒ no diffs', async () => {
    const { diffs } = await diffSql(
      'create table a(id int); create table b(id int);',
      'create table b(id int); create table a(id int);',
    )
    expect(diffs).toEqual([])
  })

  it('reordering columns ⇒ no diffs', async () => {
    const { diffs } = await diffSql(
      'create table t(a int, b int);',
      'create table t(b int, a int);',
    )
    expect(diffs).toEqual([])
  })

  it('adding one table ⇒ exactly one element-level diff', async () => {
    const { diffs } = await diffSql(
      'create table a(id int);',
      'create table a(id int); create table b(id int);',
    )
    expect(diffs).toHaveLength(1)
    expect(diffs[0].action).toBe(DiffAction.add)
  })

  it('removing one column ⇒ exactly one element-level diff', async () => {
    const { diffs } = await diffSql(
      'create table t(a int, b int);',
      'create table t(a int);',
    )
    expect(diffs).toHaveLength(1)
    expect(diffs[0].action).toBe(DiffAction.remove)
  })
})

describe('attrs composite-key + enum values set (T2.2)', () => {
  it('a Comment text change ⇒ exactly one diff (attr keyed by kind)', async () => {
    const { diffs } = await diffSql(
      "create table t(id int); comment on column t.id is 'before';",
      "create table t(id int); comment on column t.id is 'after';",
    )
    expect(diffs).toHaveLength(1)
    expect(diffs[0].action).toBe(DiffAction.replace)
  })

  it('two checks with different names map independently (change one ⇒ one diff)', async () => {
    const { diffs } = await diffSql(
      'create table t(id int, age int, constraint c_id check (id > 0), constraint c_age check (age > 0));',
      'create table t(id int, age int, constraint c_id check (id > 0), constraint c_age check (age > 18));',
    )
    expect(diffs).toHaveLength(1)
  })

  it('enum value reorder ⇒ 0 diffs (set semantics)', async () => {
    const { diffs } = await diffSql(
      "create type mood as enum ('happy','sad'); create table t(m mood);",
      "create type mood as enum ('sad','happy'); create table t(m mood);",
    )
    expect(diffs).toEqual([])
  })

  it('enum value add fires at element granularity ⇒ one diff', async () => {
    const { diffs } = await diffSql(
      "create type mood as enum ('happy'); create table t(m mood);",
      "create type mood as enum ('happy','sad'); create table t(m mood);",
    )
    expect(diffs).toHaveLength(1)
    expect(diffs[0].action).toBe(DiffAction.add)
  })
})
