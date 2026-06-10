import { ClassifierType, Diff } from '../src'
import { diffSql } from './helper/ddl'

const onlyDescription = (diffs: Diff[]): string | undefined => {
  expect(diffs).toHaveLength(1)
  return diffs[0].description
}

// Phase-1 description strings (plan §10, T3.1). Article-less wording; the `in schema`
// clause is omitted for the default schema (public).
describe('phase-1 descriptions — default schema (T3.1)', () => {
  it('case 1: added table', async () => {
    const { diffs } = await diffSql('create table a(id int);', 'create table a(id int); create table b(id int);')
    expect(onlyDescription(diffs)).toBe("[Added] table 'b'")
  })

  it('case 2: deleted table', async () => {
    const { diffs } = await diffSql('create table a(id int); create table b(id int);', 'create table a(id int);')
    expect(onlyDescription(diffs)).toBe("[Deleted] table 'b'")
  })

  it('case 3: added column', async () => {
    const { diffs } = await diffSql('create table t(id int);', 'create table t(id int, name varchar(50));')
    expect(onlyDescription(diffs)).toBe("[Added] column 'name' to table 't'")
  })

  it('case 4: deleted column', async () => {
    const { diffs } = await diffSql('create table t(id int, name varchar(50));', 'create table t(id int);')
    expect(onlyDescription(diffs)).toBe("[Deleted] column 'name' from table 't'")
  })

  it('case 5a: type change int→bigint', async () => {
    const { diffs } = await diffSql('create table t(id int);', 'create table t(id bigint);')
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'id' of table 't' from 'integer' to 'bigint'")
  })

  it('case 5b: type change varchar(50)→varchar(200)', async () => {
    const { diffs } = await diffSql('create table t(name varchar(50));', 'create table t(name varchar(200));')
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'name' of table 't' from 'varchar(50)' to 'varchar(200)'")
  })

  it('case 5c: type change int→text', async () => {
    const { diffs } = await diffSql('create table t(id int);', 'create table t(id text);')
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'id' of table 't' from 'integer' to 'text'")
  })

  it('case 6: nullability not-null→nullable', async () => {
    const { diffs } = await diffSql('create table t(id int not null);', 'create table t(id int null);')
    expect(onlyDescription(diffs)).toBe("[Changed] nullability for column 'id' of table 't' from 'not nullable' to 'nullable'")
  })

  it('case 7: nullability nullable→not-null', async () => {
    const { diffs } = await diffSql('create table t(id int null);', 'create table t(id int not null);')
    expect(onlyDescription(diffs)).toBe("[Changed] nullability for column 'id' of table 't' from 'nullable' to 'not nullable'")
  })

  it('case E1: added enum value', async () => {
    const { diffs } = await diffSql(
      "create type mood as enum ('happy','sad'); create table t(m mood);",
      "create type mood as enum ('happy','sad','neutral'); create table t(m mood);",
    )
    expect(onlyDescription(diffs)).toBe("[Added] value 'neutral' to enum 'mood'")
  })

  it('case E2: removed enum value', async () => {
    const { diffs } = await diffSql(
      "create type mood as enum ('happy','sad','neutral'); create table t(m mood);",
      "create type mood as enum ('happy','sad'); create table t(m mood);",
    )
    expect(onlyDescription(diffs)).toBe("[Deleted] value 'neutral' from enum 'mood'")
  })
})

describe('phase-2 default descriptions (T4.2)', () => {
  it('case 8: added default', async () => {
    const { diffs } = await diffSql('create table t(id int);', 'create table t(id int default 5);')
    expect(onlyDescription(diffs)).toBe("[Added] default for column 'id' of table 't'")
  })

  it('case 9: deleted default', async () => {
    const { diffs } = await diffSql('create table t(id int default 5);', 'create table t(id int);')
    expect(onlyDescription(diffs)).toBe("[Deleted] default for column 'id' of table 't'")
  })

  it('case 10: changed default (from … to …)', async () => {
    const { diffs } = await diffSql('create table t(id int default 5);', 'create table t(id int default 7);')
    expect(onlyDescription(diffs)).toBe("[Changed] default for column 'id' of table 't' from '5' to '7'")
  })
})

describe('phase-2 descriptions at schema/table/column levels (T4.3)', () => {
  it('case 11: added column description ⇒ annotation', async () => {
    const { diffs } = await diffSql(
      'create table t(id int);',
      "create table t(id int); comment on column t.id is 'hello';",
    )
    expect(diffs[0].type).toBe(ClassifierType.annotation)
    expect(onlyDescription(diffs)).toBe("[Added] description for column 'id' of table 't'")
  })

  it('case 12: deleted column description ⇒ annotation', async () => {
    const { diffs } = await diffSql(
      "create table t(id int); comment on column t.id is 'hello';",
      'create table t(id int);',
    )
    expect(diffs[0].type).toBe(ClassifierType.annotation)
    expect(onlyDescription(diffs)).toBe("[Deleted] description for column 'id' of table 't'")
  })

  it('case 13: changed column description ⇒ annotation (from … to …)', async () => {
    const { diffs } = await diffSql(
      "create table t(id int); comment on column t.id is 'a';",
      "create table t(id int); comment on column t.id is 'b';",
    )
    expect(diffs[0].type).toBe(ClassifierType.annotation)
    expect(onlyDescription(diffs)).toBe("[Changed] description for column 'id' of table 't' from 'a' to 'b'")
  })

  it('case 11s: added table description ⇒ annotation', async () => {
    const { diffs } = await diffSql(
      'create table t(id int);',
      "create table t(id int); comment on table t is 'the table';",
    )
    expect(diffs[0].type).toBe(ClassifierType.annotation)
    expect(onlyDescription(diffs)).toBe("[Added] description for table 't'")
  })
})

describe('phase-3 constraint descriptions (T5.1–T5.3)', () => {
  it('added index', async () => {
    const { diffs } = await diffSql(
      'create table t(id int, name text);',
      'create table t(id int, name text); create index idx_name on t(name);',
    )
    expect(onlyDescription(diffs)).toBe("[Added] index 'idx_name' on table 't'")
  })

  it('added primary key', async () => {
    const { diffs } = await diffSql(
      'create table t(id int not null);',
      'create table t(id int not null, primary key (id));',
    )
    expect(onlyDescription(diffs)).toBe("[Added] primary key on table 't'")
  })

  it('added foreign key', async () => {
    const { diffs } = await diffSql(
      'create table t(id int, primary key (id)); create table u(uid int, ref int);',
      'create table t(id int, primary key (id)); create table u(uid int, ref int, constraint fk_u foreign key (ref) references t(id));',
    )
    expect(onlyDescription(diffs)).toBe("[Added] foreign key 'fk_u' on table 'u'")
  })

  it('added check', async () => {
    const { diffs } = await diffSql(
      'create table t(id int);',
      'create table t(id int, constraint c_pos check (id > 0));',
    )
    expect(onlyDescription(diffs)).toBe("[Added] check 'c_pos' on table 't'")
  })
})

describe('phase-1 descriptions — named (non-default) schema (T3.1)', () => {
  it('added column in a non-default schema includes the in-schema clause', async () => {
    const { diffs } = await diffSql(
      'create table s.t(id int);',
      'create table s.t(id int, name varchar(50));',
    )
    expect(onlyDescription(diffs)).toBe("[Added] column 'name' to table 't' in schema 's'")
  })
})
