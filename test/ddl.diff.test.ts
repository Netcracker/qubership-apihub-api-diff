import { apiDiff, ClassifierType, Diff, DiffAction } from '../src'
import { buildRealm, diffSql } from './helper/ddl'

// Asserts there is exactly one diff and returns its (action, type).
const onlyDiff = (diffs: Diff[]): { action: string; type: string } => {
  expect(diffs).toHaveLength(1)
  return { action: diffs[0].action, type: diffs[0].type }
}

describe('ddl diff — engine registration (T1.1)', () => {
  it('identical realms produce no diffs', async () => {
    const { diffs } = await diffSql('create table t(id int);', 'create table t(id int);')
    expect(diffs).toEqual([])
  })

  it('throws a spec-mismatch error when comparing ddlapi against another spec type', async () => {
    const realm = await buildRealm('create table t(id int);')
    const openapi = { openapi: '3.0.0', info: { title: 't', version: '1' }, paths: {} }
    expect(() => apiDiff(realm, openapi)).toThrow(/Specification cannot be different/)
  })
})

describe('ddl diff — rule-tree skeleton (T1.2)', () => {
  it('identical realms ⇒ 0 diffs', async () => {
    const { diffs } = await diffSql(
      'create table orders(id int, name varchar(50));',
      'create table orders(id int, name varchar(50));',
    )
    expect(diffs).toEqual([])
  })

  it('a raw-only change (same canonical type) ⇒ 0 diffs', async () => {
    const before = await buildRealm('create table t(id integer);')
    const after = await buildRealm('create table t(id integer);')
    // raw is redundant with type.type and its replace is suppressed (§9b). raw is present
    // on both sides in real parses; set both here so the change is a replace, not an add.
    ;(before as any).schemas[0].tables[0].columns[0].type.raw = 'integer'
    ;(after as any).schemas[0].tables[0].columns[0].type.raw = 'int4'
    const { diffs } = apiDiff(before, after)
    expect(diffs).toEqual([])
  })

  it('kind + raw are suppressed inside a real type change ⇒ exactly one diff', async () => {
    // int→text flips the SchemaType `kind` (IntegerType→StringType) and `raw`; without
    // suppression that would surface as separate kind/raw diffs. The atomic type resolver
    // plus `/kind` + `/raw` suppression collapse it to a single replace (§9b).
    const { diffs } = await diffSql('create table t(c int);', 'create table t(c text);')
    expect(diffs).toHaveLength(1)
    expect(diffs[0].action).toBe(DiffAction.replace)
  })

  it('an unknown object kind change ⇒ unclassified (dialect/core miss falls back)', async () => {
    const before = await buildRealm('create table t(id int);')
    const after = await buildRealm('create table t(id int);')
    ;(after as any).schemas[0].objects = [{ kind: 'MysteryThing', name: 'm' }]
    const { diffs } = apiDiff(before, after)
    expect(diffs).toHaveLength(1)
    expect(diffs[0].action).toBe(DiffAction.add)
    expect(diffs[0].type).toBe(ClassifierType.unclassified)
  })
})

describe('ddl diff — phase-1 classification (M2)', () => {
  it('case 1: added table ⇒ add / non-breaking', async () => {
    const { diffs } = await diffSql(
      'create table a(id int);',
      'create table a(id int); create table b(id int);',
    )
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.add, type: ClassifierType.nonBreaking })
  })

  it('case 2: deleted table ⇒ remove / breaking', async () => {
    const { diffs } = await diffSql(
      'create table a(id int); create table b(id int);',
      'create table a(id int);',
    )
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.remove, type: ClassifierType.breaking })
  })

  it('case 3: added column ⇒ add / non-breaking', async () => {
    const { diffs } = await diffSql(
      'create table t(id int);',
      'create table t(id int, name varchar(50));',
    )
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.add, type: ClassifierType.nonBreaking })
  })

  it('case 4: deleted column ⇒ remove / breaking', async () => {
    const { diffs } = await diffSql(
      'create table t(id int, name varchar(50));',
      'create table t(id int);',
    )
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.remove, type: ClassifierType.breaking })
  })

  it('case 5a: same-family type change (int→bigint) ⇒ replace / non-breaking', async () => {
    const { diffs } = await diffSql('create table t(id int);', 'create table t(id bigint);')
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.replace, type: ClassifierType.nonBreaking })
  })

  it('case 5b: same-family widening (varchar(50)→varchar(200)) ⇒ replace / non-breaking', async () => {
    const { diffs } = await diffSql(
      'create table t(name varchar(50));',
      'create table t(name varchar(200));',
    )
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.replace, type: ClassifierType.nonBreaking })
  })

  it('case 5c: cross-family type change (int→text) ⇒ replace / breaking', async () => {
    const { diffs } = await diffSql('create table t(id int);', 'create table t(id text);')
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.replace, type: ClassifierType.breaking })
  })

  it('case 6: nullability not-null→nullable ⇒ replace / non-breaking', async () => {
    const { diffs } = await diffSql(
      'create table t(id int not null);',
      'create table t(id int null);',
    )
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.replace, type: ClassifierType.nonBreaking })
  })

  it('case 7: nullability nullable→not-null ⇒ replace / non-breaking', async () => {
    const { diffs } = await diffSql(
      'create table t(id int null);',
      'create table t(id int not null);',
    )
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.replace, type: ClassifierType.nonBreaking })
  })

  it('case E1: added enum value ⇒ add / non-breaking', async () => {
    const { diffs } = await diffSql(
      "create type mood as enum ('happy','sad'); create table t(m mood);",
      "create type mood as enum ('happy','sad','neutral'); create table t(m mood);",
    )
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.add, type: ClassifierType.nonBreaking })
  })

  it('case E2: removed enum value ⇒ remove / non-breaking', async () => {
    const { diffs } = await diffSql(
      "create type mood as enum ('happy','sad','neutral'); create table t(m mood);",
      "create type mood as enum ('happy','sad'); create table t(m mood);",
    )
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.remove, type: ClassifierType.nonBreaking })
  })
})

describe('ddl diff — phase-2 default classification (M4)', () => {
  it('case 8: added default ⇒ add / non-breaking', async () => {
    const { diffs } = await diffSql('create table t(id int);', 'create table t(id int default 5);')
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.add, type: ClassifierType.nonBreaking })
  })

  it('case 9: deleted default ⇒ remove / non-breaking', async () => {
    const { diffs } = await diffSql('create table t(id int default 5);', 'create table t(id int);')
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.remove, type: ClassifierType.nonBreaking })
  })

  it('case 10: changed default ⇒ replace / non-breaking', async () => {
    const { diffs } = await diffSql('create table t(id int default 5);', 'create table t(id int default 7);')
    expect(onlyDiff(diffs)).toEqual({ action: DiffAction.replace, type: ClassifierType.nonBreaking })
  })

  it('unchanged default ⇒ 0 diffs', async () => {
    const { diffs } = await diffSql('create table t(id int default 5);', 'create table t(id int default 5);')
    expect(diffs).toEqual([])
  })
})
