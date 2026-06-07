import { apiDiff, breaking, Diff, DiffAction, nonBreaking, unclassified } from '../src'
import { buildRealm, diffSql } from './helper/ddl'
import { diffsMatcher } from './helper/matchers'

// Behavioural ddlapi diff tests: assert action / type / before|afterValue /
// before|afterDeclarationPaths only. Human-readable description strings are asserted
// exclusively in ddl.description.test.ts (to keep the impact surface of wording changes small).

describe('ddl diff — engine registration (T1.1)', () => {
  it('identical realms produce no diffs', async () => {
    const sql = 'create table t(id int);'
    const { diffs } = await diffSql(sql, sql)
    expect(diffs).toHaveLength(0)
  })

  it('throws a spec-mismatch error when comparing ddlapi against another spec type', async () => {
    const realm = await buildRealm('create table t(id int);')
    const openapi = { openapi: '3.0.0', info: { title: 't', version: '1' }, paths: {} }
    expect(() => apiDiff(realm, openapi)).toThrow(/Specification cannot be different/)
  })
})

describe('ddl diff — rule-tree skeleton (T1.2)', () => {
  it('identical realms ⇒ 0 diffs', async () => {
    const sql = 'create table orders(id int, name varchar(50));'
    const { diffs } = await diffSql(sql, sql)
    expect(diffs).toHaveLength(0)
  })

  it('a raw-only change (same canonical type) ⇒ 0 diffs', async () => {
    const before = await buildRealm('create table t(id integer);')
    const after = await buildRealm('create table t(id integer);')
    // raw is redundant with type.type and its replace is suppressed (§9b). raw is present
    // on both sides in real parses; set both here so the change is a replace, not an add.
    ;(before as any).schemas[0].tables[0].columns[0].type.raw = 'integer'
    ;(after as any).schemas[0].tables[0].columns[0].type.raw = 'int4'
    const { diffs } = apiDiff(before, after)
    expect(diffs).toHaveLength(0)
  })

  it('kind + raw are suppressed inside a real type change ⇒ exactly one diff', async () => {
    // int→text flips the SchemaType `kind` (IntegerType→StringType) and `raw`; without
    // suppression that would surface as separate kind/raw diffs. The atomic type resolver
    // plus `/kind` + `/raw` suppression collapse it to a single replace (§9b).
    const beforeSql = 'create table t(c int);'
    const afterSql = 'create table t(c text);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // one collapsed type replace
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: breaking,
        beforeValue: expect.objectContaining({ kind: 'IntegerType', type: 'integer' }),
        afterValue: expect.objectContaining({ kind: 'StringType', type: 'text' }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type']],
      }),
    ]))
  })

  it('an unknown object kind change ⇒ unclassified (dialect/core miss falls back)', async () => {
    const before = await buildRealm('create table t(id int);')
    const after = await buildRealm('create table t(id int);')
    ;(after as any).schemas[0].objects = [{ kind: 'MysteryThing', name: 'm' }]
    const { diffs } = apiDiff(before, after)
    expect(diffs).toHaveLength(1) // the single unknown object add
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: unclassified,
        afterValue: expect.objectContaining({ kind: 'MysteryThing', name: 'm' }),
      }),
    ]))
  })
})

describe('ddl diff — phase-1 classification (M2)', () => {
  it('case 1: added table ⇒ add / non-breaking', async () => {
    const beforeSql = 'create table a(id int);'
    const afterSql = 'create table a(id int); create table b(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added table
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ kind: 'Table', name: 'b' }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 1]],
      }),
    ]))
  })

  it('case 2: deleted table ⇒ remove / breaking', async () => {
    const beforeSql = 'create table a(id int); create table b(id int);'
    const afterSql = 'create table a(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the deleted table
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        type: breaking,
        beforeValue: expect.objectContaining({ kind: 'Table', name: 'b' }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 1]],
      }),
    ]))
  })

  it('case 3: added column ⇒ add / non-breaking', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id int, name varchar(50));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added column
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ name: 'name' }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 1]],
      }),
    ]))
  })

  it('case 4: deleted column ⇒ remove / breaking', async () => {
    const beforeSql = 'create table t(id int, name varchar(50));'
    const afterSql = 'create table t(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the deleted column
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        type: breaking,
        beforeValue: expect.objectContaining({ name: 'name' }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 1]],
      }),
    ]))
  })

  it('case 5a: same-family type change (int→bigint) ⇒ replace / non-breaking', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id bigint);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the type replace
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: expect.objectContaining({ kind: 'IntegerType', type: 'integer' }),
        afterValue: expect.objectContaining({ kind: 'IntegerType', type: 'bigint' }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type']],
      }),
    ]))
  })

  it('case 5b: same-family widening (varchar(50)→varchar(200)) ⇒ replace / non-breaking', async () => {
    const beforeSql = 'create table t(name varchar(50));'
    const afterSql = 'create table t(name varchar(200));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the type replace
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: expect.objectContaining({ kind: 'StringType', type: 'varchar', size: 50 }),
        afterValue: expect.objectContaining({ kind: 'StringType', type: 'varchar', size: 200 }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type']],
      }),
    ]))
  })

  it('case 5c: cross-family type change (int→text) ⇒ replace / breaking', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id text);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the type replace
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: breaking,
        beforeValue: expect.objectContaining({ kind: 'IntegerType', type: 'integer' }),
        afterValue: expect.objectContaining({ kind: 'StringType', type: 'text' }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'type']],
      }),
    ]))
  })

  it('case 6: nullability not-null→nullable ⇒ replace / non-breaking', async () => {
    const beforeSql = 'create table t(id int not null);'
    const afterSql = 'create table t(id int null);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the nullability replace
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: false,
        afterValue: true,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'null']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'null']],
      }),
    ]))
  })

  it('case 7: nullability nullable→not-null ⇒ replace / non-breaking', async () => {
    const beforeSql = 'create table t(id int null);'
    const afterSql = 'create table t(id int not null);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the nullability replace
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: true,
        afterValue: false,
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'null']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'type', 'null']],
      }),
    ]))
  })

  it('case E1: added enum value ⇒ add / non-breaking', async () => {
    const beforeSql = "create type mood as enum ('happy','sad'); create table t(m mood);"
    const afterSql = "create type mood as enum ('happy','sad','neutral'); create table t(m mood);"
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added enum value
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: 'neutral',
        afterDeclarationPaths: [['schemas', 0, 'objects', 0, 'values', 2]],
      }),
    ]))
  })

  it('case E2: removed enum value ⇒ remove / non-breaking', async () => {
    const beforeSql = "create type mood as enum ('happy','sad','neutral'); create table t(m mood);"
    const afterSql = "create type mood as enum ('happy','sad'); create table t(m mood);"
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the removed enum value
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        type: nonBreaking,
        beforeValue: 'neutral',
        beforeDeclarationPaths: [['schemas', 0, 'objects', 0, 'values', 2]],
      }),
    ]))
  })
})

describe('ddl diff — phase-2 default classification (M4)', () => {
  it('case 8: added default ⇒ add / non-breaking', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id int default 5);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the added default
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        type: nonBreaking,
        afterValue: expect.objectContaining({ kind: 'Literal', value: '5' }),
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'default']],
      }),
    ]))
  })

  it('case 9: deleted default ⇒ remove / non-breaking', async () => {
    const beforeSql = 'create table t(id int default 5);'
    const afterSql = 'create table t(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the deleted default
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        type: nonBreaking,
        beforeValue: expect.objectContaining({ kind: 'Literal', value: '5' }),
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'default']],
      }),
    ]))
  })

  it('case 10: changed default ⇒ replace / non-breaking', async () => {
    const beforeSql = 'create table t(id int default 5);'
    const afterSql = 'create table t(id int default 7);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(1) // the changed default value
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: nonBreaking,
        beforeValue: '5',
        afterValue: '7',
        beforeDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'default', 'value']],
        afterDeclarationPaths: [['schemas', 0, 'tables', 0, 'columns', 0, 'default', 'value']],
      }),
    ]))
  })

  it('unchanged default ⇒ 0 diffs', async () => {
    const sql = 'create table t(id int default 5);'
    const { diffs } = await diffSql(sql, sql)
    expect(diffs).toHaveLength(0)
  })
})
