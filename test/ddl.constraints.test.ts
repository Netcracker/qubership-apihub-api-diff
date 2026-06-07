import { ClassifierType, Diff, DiffAction } from '../src'
import { diffSql } from './helper/ddl'

const onlyDiff = (diffs: Diff[]): { action: string; type: string; description: string | undefined } => {
  expect(diffs).toHaveLength(1)
  return { action: diffs[0].action, type: diffs[0].type, description: diffs[0].description }
}

const allNonBreaking = (diffs: Diff[]): boolean => diffs.every(d => d.type === ClassifierType.nonBreaking)

// Phase-3 — constraints & access structures. All non-breaking for a reader (plan §6/§12).

describe('indexes / primary key / unique (T5.1)', () => {
  it('add index ⇒ one non-breaking diff + description', async () => {
    const { diffs } = await diffSql(
      'create table t(id int, name text);',
      'create table t(id int, name text); create index idx_name on t(name);',
    )
    expect(onlyDiff(diffs)).toEqual({
      action: DiffAction.add,
      type: ClassifierType.nonBreaking,
      description: 'Added index idx_name on table t',
    })
  })

  it('remove index ⇒ one non-breaking diff', async () => {
    const { diffs } = await diffSql(
      'create table t(id int, name text); create index idx_name on t(name);',
      'create table t(id int, name text);',
    )
    expect(onlyDiff(diffs)).toMatchObject({ action: DiffAction.remove, type: ClassifierType.nonBreaking })
  })

  it('primary key add ⇒ non-breaking + description', async () => {
    const { diffs } = await diffSql(
      'create table t(id int not null);',
      'create table t(id int not null, primary key (id));',
    )
    expect(onlyDiff(diffs)).toEqual({
      action: DiffAction.add,
      type: ClassifierType.nonBreaking,
      description: 'Added primary key on table t',
    })
  })

  it('unique flip true→false ⇒ non-breaking', async () => {
    const { diffs } = await diffSql(
      'create table t(name text); create unique index u on t(name);',
      'create table t(name text); create index u on t(name);',
    )
    expect(diffs.length).toBeGreaterThanOrEqual(1)
    expect(allNonBreaking(diffs)).toBe(true)
    expect(diffs.some(d => d.action === DiffAction.replace)).toBe(true)
  })

  it('reorder index columns ⇒ non-breaking seqNo diffs, not 0 and not add/remove', async () => {
    const { diffs } = await diffSql(
      'create table t(a int, b int); create index idx on t(a, b);',
      'create table t(a int, b int); create index idx on t(b, a);',
    )
    expect(diffs.length).toBeGreaterThan(0)
    expect(allNonBreaking(diffs)).toBe(true)
    expect(diffs.every(d => d.action === DiffAction.replace)).toBe(true)
  })

  it('add a column to a composite index ⇒ one non-breaking diff', async () => {
    const { diffs } = await diffSql(
      'create table t(a int, b int); create index idx on t(a);',
      'create table t(a int, b int); create index idx on t(a, b);',
    )
    expect(diffs).toHaveLength(1)
    expect(diffs[0].type).toBe(ClassifierType.nonBreaking)
    expect(diffs[0].action).toBe(DiffAction.add)
  })
})

describe('foreign keys (T5.2)', () => {
  const BEFORE_NO_FK = 'create table t(id int, primary key (id)); create table u(uid int, ref int);'
  const AFTER_FK = 'create table t(id int, primary key (id)); create table u(uid int, ref int, constraint fk_u foreign key (ref) references t(id));'

  it('add foreign key ⇒ one non-breaking diff + description', async () => {
    const { diffs } = await diffSql(BEFORE_NO_FK, AFTER_FK)
    expect(onlyDiff(diffs)).toEqual({
      action: DiffAction.add,
      type: ClassifierType.nonBreaking,
      description: 'Added foreign key fk_u on table u',
    })
  })

  it('remove foreign key ⇒ one non-breaking diff', async () => {
    const { diffs } = await diffSql(AFTER_FK, BEFORE_NO_FK)
    expect(onlyDiff(diffs)).toMatchObject({ action: DiffAction.remove, type: ClassifierType.nonBreaking })
  })

  it('change onDelete ⇒ non-breaking', async () => {
    const { diffs } = await diffSql(
      'create table t(id int, primary key (id)); create table u(ref int, constraint fk_u foreign key (ref) references t(id) on delete no action);',
      'create table t(id int, primary key (id)); create table u(ref int, constraint fk_u foreign key (ref) references t(id) on delete cascade);',
    )
    expect(diffs.length).toBeGreaterThanOrEqual(1)
    expect(allNonBreaking(diffs)).toBe(true)
  })

  it('a change reached via fk.refTable is the same Diff (appears once)', async () => {
    const { diffs, merged } = await diffSql(
      'create table t(id int, primary key (id)); create table u(ref int, constraint fk_u foreign key (ref) references t(id));',
      'create table t(id int, primary key (id), note text); create table u(ref int, constraint fk_u foreign key (ref) references t(id));',
    )
    // The added column on t appears once, even though t is reachable via u.foreignKeys[].refTable.
    expect(diffs).toHaveLength(1)
    expect(diffs[0].action).toBe(DiffAction.add)

    const tables = (merged as any).schemas[0].tables
    const t = tables.find((tbl: any) => tbl.name === 't')
    const u = tables.find((tbl: any) => tbl.name === 'u')
    expect(u.foreignKeys[0].refTable).toBe(t)
  })
})

describe('check constraints (T5.3)', () => {
  it('add check ⇒ one non-breaking diff + description', async () => {
    const { diffs } = await diffSql(
      'create table t(id int);',
      'create table t(id int, constraint c_pos check (id > 0));',
    )
    expect(onlyDiff(diffs)).toEqual({
      action: DiffAction.add,
      type: ClassifierType.nonBreaking,
      description: 'Added check c_pos on table t',
    })
  })

  it('change a check expr ⇒ non-breaking', async () => {
    const { diffs } = await diffSql(
      'create table t(id int, constraint c_pos check (id > 0));',
      'create table t(id int, constraint c_pos check (id > 5));',
    )
    expect(diffs.length).toBeGreaterThanOrEqual(1)
    expect(allNonBreaking(diffs)).toBe(true)
  })

  it('two checks with different names map independently (change one ⇒ one diff)', async () => {
    const { diffs } = await diffSql(
      'create table t(id int, age int, constraint c_id check (id > 0), constraint c_age check (age > 0));',
      'create table t(id int, age int, constraint c_id check (id > 0), constraint c_age check (age > 18));',
    )
    expect(diffs).toHaveLength(1)
    expect(diffs[0].type).toBe(ClassifierType.nonBreaking)
  })
})
