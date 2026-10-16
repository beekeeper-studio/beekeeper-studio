import { describe, it, expect } from 'vitest'
import { hasPlanColumns, isExplainResult, isExplainStatement } from '@/common/explain'

describe('isExplainStatement', () => {
  it.each([
    'EXPLAIN SELECT 1',
    'explain analyze select * from users',
    'EXPLAIN (FORMAT JSON) SELECT 1',
    '  \n explain select 1',
    '-- why is this slow\nEXPLAIN SELECT 1',
    '/* plan */ EXPLAIN QUERY PLAN SELECT 1',
  ])('accepts %j', (sql) => {
    expect(isExplainStatement(sql)).toBe(true)
  })

  it.each([
    'SELECT 1',
    "SELECT 'explain'",
    'explained_rows',
    '-- EXPLAIN SELECT 1',
    '',
    null,
    undefined,
  ])('rejects %j', (sql) => {
    expect(isExplainStatement(sql)).toBe(false)
  })
})

describe('hasPlanColumns', () => {
  it('spots plan output by its columns', () => {
    expect(hasPlanColumns([{ name: 'QUERY PLAN' }])).toBe(true)
    expect(hasPlanColumns([{ name: 'EXPLAIN' }])).toBe(true)
    expect(hasPlanColumns([{ name: 'id' }, { name: 'parent' }, { name: 'notused' }, { name: 'detail' }])).toBe(true)
  })

  it('ignores ordinary results', () => {
    expect(hasPlanColumns([{ name: 'id' }, { name: 'name' }])).toBe(false)
    expect(hasPlanColumns([{ name: 'QUERY PLAN' }, { name: 'other' }])).toBe(false)
    expect(hasPlanColumns([])).toBe(false)
    expect(hasPlanColumns(undefined)).toBe(false)
  })
})

describe('isExplainResult', () => {
  it('uses the statement or the columns', () => {
    expect(isExplainResult({ fields: [{ name: 'id' }] }, 'EXPLAIN SELECT 1')).toBe(true)
    expect(isExplainResult({ fields: [{ name: 'QUERY PLAN' }] }, null)).toBe(true)
    expect(isExplainResult({ fields: [{ name: 'id' }] }, 'SELECT 1')).toBe(false)
    expect(isExplainResult(undefined, undefined)).toBe(false)
  })
})
