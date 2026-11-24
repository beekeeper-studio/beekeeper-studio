import { describe, it, expect } from 'vitest'
import { disallowedStatements, permissionsFor } from '@/services/cliServer/queryPermissions'

function needs(sql: string) {
  return permissionsFor(sql, 'psql').map((s) => s.needs)
}

describe('permissionsFor', () => {
  it.each([
    ['select 1', ['select']],
    ['explain select 1', ['select']],
    ['update t set a = 1', ['update']],
    ['delete from t', ['delete']],
    ['alter table t add column b int', ['alter']],
    ['insert into t values (1)', ['anything']],
    ['drop table t', ['anything']],
    ['show search_path', ['anything']],
  ])('%s needs %j', (sql, expected) => {
    expect(needs(sql)).toEqual([expected])
  })

  it('makes EXPLAIN ANALYZE need the explained statement too, since it runs it', () => {
    expect(needs('explain analyze select 1')).toEqual([['explain-analyze', 'select']])
    expect(needs('explain (analyze, buffers) delete from t')).toEqual([['explain-analyze', 'delete']])
  })

  it('sees writes hidden in a CTE', () => {
    expect(needs('with d as (delete from t returning *) select * from d')).toEqual([['select', 'delete']])
    expect(needs('with x as (select 1) select * from x')).toEqual([['select']])
  })

  it('lets transaction control through', () => {
    expect(needs('begin; update t set a = 1; commit;')).toEqual([[], ['update'], []])
  })
})

describe('disallowedStatements', () => {
  it('reports only the statements and permissions that are missing', () => {
    const result = disallowedStatements('select 1; delete from t; update t set a = 1', 'psql', ['select', 'update'])
    expect(result).toEqual([{ text: 'delete from t;', needs: ['delete'] }])
  })

  it('allows everything with anything', () => {
    expect(disallowedStatements('drop table t', 'psql', ['anything'])).toEqual([])
  })
})
