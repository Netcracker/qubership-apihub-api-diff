import { annotation, Diff } from '../src'
import { diffSql } from './helper/ddl'

const onlyDescription = (diffs: Diff[]): string | undefined => {
  expect(diffs).toHaveLength(1)
  return diffs[0].description
}

// Phase-1 description strings (plan §10, T3.1). Article-less wording; the `in schema`
// clause is omitted for the default schema (public). The action is bracketed and entity
// names / values are wrapped in apostrophes.
describe('phase-1 descriptions — default schema (T3.1)', () => {
  it('case 1: added table', async () => {
    const beforeSql = `
      create table a(id int);
    `
    const afterSql = `
      create table a(id int);
      create table b(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] table 'b'")
  })

  it('case 2: deleted table', async () => {
    const beforeSql = `
      create table a(id int);
      create table b(id int);
    `
    const afterSql = `
      create table a(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] table 'b'")
  })

  it('case 3: added column', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id int, name varchar(50));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] column 'name' to table 't'")
  })

  it('case 4: deleted column', async () => {
    const beforeSql = 'create table t(id int, name varchar(50));'
    const afterSql = 'create table t(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] column 'name' from table 't'")
  })

  it('case 5a: type change int→bigint', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id bigint);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'id' of table 't' from 'integer' to 'bigint'")
  })

  it('case 5b: type change varchar(50)→varchar(200)', async () => {
    const beforeSql = 'create table t(name varchar(50));'
    const afterSql = 'create table t(name varchar(200));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'name' of table 't' from 'varchar(50)' to 'varchar(200)'")
  })

  it('case 5c: type change int→text', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id text);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'id' of table 't' from 'integer' to 'text'")
  })

  it('case 5d: numeric precision/scale change renders the whole type', async () => {
    const beforeSql = 'create table t(n numeric(10,2));'
    const afterSql = 'create table t(n numeric(10,0));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] type for column 'n' of table 't' from 'numeric(10,2)' to 'numeric(10,0)'")
  })

  it('case 6: nullability not-null→nullable', async () => {
    const beforeSql = 'create table t(id int not null);'
    const afterSql = 'create table t(id int null);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] nullability for column 'id' of table 't' from 'not nullable' to 'nullable'")
  })

  it('case 7: nullability nullable→not-null', async () => {
    const beforeSql = 'create table t(id int null);'
    const afterSql = 'create table t(id int not null);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] nullability for column 'id' of table 't' from 'nullable' to 'not nullable'")
  })

  it('case E1: added enum value', async () => {
    const beforeSql = `
      create type mood as enum ('happy', 'sad');
      create table t(m mood);
    `
    const afterSql = `
      create type mood as enum ('happy', 'sad', 'neutral');
      create table t(m mood);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] value 'neutral' to enum 'mood'")
  })

  it('case E2: removed enum value', async () => {
    const beforeSql = `
      create type mood as enum ('happy', 'sad', 'neutral');
      create table t(m mood);
    `
    const afterSql = `
      create type mood as enum ('happy', 'sad');
      create table t(m mood);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] value 'neutral' from enum 'mood'")
  })
})

describe('phase-2 default descriptions (T4.2)', () => {
  it('case 8: added default', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id int default 5);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] default for column 'id' of table 't'")
  })

  it('case 9: deleted default', async () => {
    const beforeSql = 'create table t(id int default 5);'
    const afterSql = 'create table t(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] default for column 'id' of table 't'")
  })

  it('case 10: changed default (from … to …)', async () => {
    const beforeSql = 'create table t(id int default 5);'
    const afterSql = 'create table t(id int default 7);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] default for column 'id' of table 't' from '5' to '7'")
  })

  it('case 10 (raw expression default): changed default expression', async () => {
    const beforeSql = 'create table t(ts timestamp default now());'
    const afterSql = 'create table t(ts timestamp default current_timestamp);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] default for column 'ts' of table 't' from 'now()' to 'CURRENT_TIMESTAMP'")
  })
})

describe('phase-2 descriptions at schema/table/column levels (T4.3)', () => {
  it('case 11: added column description ⇒ annotation', async () => {
    const beforeSql = `
      create table t(id int);
    `
    const afterSql = `
      create table t(id int);
      comment on column t.id is 'hello';
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs[0].type).toBe(annotation)
    expect(onlyDescription(diffs)).toBe("[Added] description for column 'id' of table 't'")
  })

  it('case 12: deleted column description ⇒ annotation', async () => {
    const beforeSql = `
      create table t(id int);
      comment on column t.id is 'hello';
    `
    const afterSql = `
      create table t(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs[0].type).toBe(annotation)
    expect(onlyDescription(diffs)).toBe("[Deleted] description for column 'id' of table 't'")
  })

  it('case 13: changed column description ⇒ annotation (from … to …)', async () => {
    const beforeSql = `
      create table t(id int);
      comment on column t.id is 'a';
    `
    const afterSql = `
      create table t(id int);
      comment on column t.id is 'b';
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs[0].type).toBe(annotation)
    expect(onlyDescription(diffs)).toBe("[Changed] description for column 'id' of table 't' from 'a' to 'b'")
  })

  it('case 11s: added table description ⇒ annotation', async () => {
    const beforeSql = `
      create table t(id int);
    `
    const afterSql = `
      create table t(id int);
      comment on table t is 'the table';
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs[0].type).toBe(annotation)
    expect(onlyDescription(diffs)).toBe("[Added] description for table 't'")
  })

  it('case 12s: deleted table description ⇒ annotation', async () => {
    const beforeSql = `
      create table t(id int);
      comment on table t is 'the table';
    `
    const afterSql = `
      create table t(id int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs[0].type).toBe(annotation)
    expect(onlyDescription(diffs)).toBe("[Deleted] description for table 't'")
  })

  it('case 13s: changed table description ⇒ annotation (from … to …)', async () => {
    const beforeSql = `
      create table t(id int);
      comment on table t is 'a';
    `
    const afterSql = `
      create table t(id int);
      comment on table t is 'b';
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs[0].type).toBe(annotation)
    expect(onlyDescription(diffs)).toBe("[Changed] description for table 't' from 'a' to 'b'")
  })
})

describe('phase-3 constraint descriptions (T5.1–T5.3)', () => {
  it('added index', async () => {
    const beforeSql = `
      create table t(id int, name text);
    `
    const afterSql = `
      create table t(id int, name text);
      create index idx_name on t(name);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] index 'idx_name' on table 't'")
  })

  it('added primary key', async () => {
    const beforeSql = 'create table t(id int not null);'
    const afterSql = 'create table t(id int not null, primary key (id));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] primary key on table 't'")
  })

  it('added foreign key', async () => {
    const beforeSql = `
      create table t(id int, primary key (id));
      create table u(uid int, ref int);
    `
    const afterSql = `
      create table t(id int, primary key (id));
      create table u(uid int, ref int, constraint fk_u foreign key (ref) references t(id));
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] foreign key 'fk_u' on table 'u'")
  })

  it('removed index', async () => {
    const beforeSql = `
      create table t(id int, name text);
      create index idx_name on t(name);
    `
    const afterSql = `
      create table t(id int, name text);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] index 'idx_name' on table 't'")
  })

  it('changed index (unique flip)', async () => {
    const beforeSql = `
      create table t(name text);
      create unique index u on t(name);
    `
    const afterSql = `
      create table t(name text);
      create index u on t(name);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] index 'u' on table 't'")
  })

  it('added column to a composite index (index part add)', async () => {
    const beforeSql = `
      create table t(a int, b int);
      create index idx on t(a);
    `
    const afterSql = `
      create table t(a int, b int);
      create index idx on t(a, b);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] index 'idx' on table 't'")
  })

  it('changed index (column reorder) ⇒ one description per moved part', async () => {
    const beforeSql = `
      create table t(a int, b int);
      create index idx on t(a, b);
    `
    const afterSql = `
      create table t(a int, b int);
      create index idx on t(b, a);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(diffs).toHaveLength(2)
    expect(diffs.map(d => d.description)).toEqual([
      "[Changed] index 'idx' on table 't'",
      "[Changed] index 'idx' on table 't'",
    ])
  })

  it('removed primary key', async () => {
    const beforeSql = 'create table t(id int not null, primary key (id));'
    const afterSql = 'create table t(id int not null);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] primary key on table 't'")
  })

  it('removed foreign key', async () => {
    const beforeSql = `
      create table t(id int, primary key (id));
      create table u(uid int, ref int, constraint fk_u foreign key (ref) references t(id));
    `
    const afterSql = `
      create table t(id int, primary key (id));
      create table u(uid int, ref int);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] foreign key 'fk_u' on table 'u'")
  })

  it('changed foreign key (onDelete)', async () => {
    const beforeSql = `
      create table t(id int, primary key (id));
      create table u(ref int, constraint fk_u foreign key (ref) references t(id) on delete no action);
    `
    const afterSql = `
      create table t(id int, primary key (id));
      create table u(ref int, constraint fk_u foreign key (ref) references t(id) on delete cascade);
    `
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] foreign key 'fk_u' on table 'u'")
  })

  it('added check', async () => {
    const beforeSql = 'create table t(id int);'
    const afterSql = 'create table t(id int, constraint c_pos check (id > 0));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] check 'c_pos' on table 't'")
  })

  it('removed check', async () => {
    const beforeSql = 'create table t(id int, constraint c_pos check (id > 0));'
    const afterSql = 'create table t(id int);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] check 'c_pos' on table 't'")
  })

  it('changed check (expr)', async () => {
    const beforeSql = 'create table t(id int, constraint c_pos check (id > 0));'
    const afterSql = 'create table t(id int, constraint c_pos check (id > 5));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] check 'c_pos' on table 't'")
  })
})

describe('column value attrs — collation / generated expression', () => {
  it('added collation', async () => {
    const beforeSql = 'create table t(c text);'
    const afterSql = 'create table t(c text collate "C");'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] collation for column 'c' of table 't'")
  })

  it('deleted collation', async () => {
    const beforeSql = 'create table t(c text collate "C");'
    const afterSql = 'create table t(c text);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Deleted] collation for column 'c' of table 't'")
  })

  it('changed collation (from … to …)', async () => {
    const beforeSql = 'create table t(c text collate "C");'
    const afterSql = 'create table t(c text collate "POSIX");'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] collation for column 'c' of table 't' from 'C' to 'POSIX'")
  })

  it('added generated expression', async () => {
    const beforeSql = 'create table t(a int, b int);'
    const afterSql = 'create table t(a int, b int generated always as (a * 2) stored);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] generated expression for column 'b' of table 't'")
  })

  it('changed generated expression (from … to …)', async () => {
    const beforeSql = 'create table t(a int, b int generated always as (a * 2) stored);'
    const afterSql = 'create table t(a int, b int generated always as (a * 3) stored);'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Changed] generated expression for column 'b' of table 't' from 'a * 2' to 'a * 3'")
  })
})

describe('phase-1 descriptions — named (non-default) schema (T3.1)', () => {
  it('added column in a non-default schema includes the in-schema clause', async () => {
    const beforeSql = 'create table s.t(id int);'
    const afterSql = 'create table s.t(id int, name varchar(50));'
    const { diffs } = await diffSql(beforeSql, afterSql)
    expect(onlyDescription(diffs)).toBe("[Added] column 'name' to table 't' in schema 's'")
  })
})
