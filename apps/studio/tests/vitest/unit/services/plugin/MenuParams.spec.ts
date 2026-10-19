import { describe, it, expect } from 'vitest'
import { buildParamsForStatusbar } from '@/services/plugin/web/MenuParams'
import { fakeTabulator } from '../../common/fakeTabulator'

describe('buildParamsForStatusbar', () => {
  it('sends the whole result when nothing is selected', () => {
    const params = buildParamsForStatusbar({ tabulator: fakeTabulator([0, 0, ['c0']]), query: 'select * from cities', truncated: true })

    expect(params.source).toBe('result')
    expect(params.activeRange).toEqual({
      rows: [1, 2],
      columns: ['id', 'city'],
      value: [[1, 'Seattle'], [2, 'Brooklyn']],
    })
    expect(params.target).toEqual({ type: 'corner', ...params.activeRange })
    expect(params.query).toBe('select * from cities')
    expect(params.truncated).toBe(true)
    expect(params.entity).toBeUndefined()
  })

  it('sends only the selection when one is made', () => {
    const params = buildParamsForStatusbar({ tabulator: fakeTabulator([1, 1, ['c0', 'c1']]), query: 'select 1' })

    expect(params.source).toBe('selection')
    expect(params.activeRange).toEqual({ rows: [2], columns: ['id', 'city'], value: [[2, 'Brooklyn']] })
  })

  it('sends one row picked from its header, not the whole result', () => {
    const params = buildParamsForStatusbar({ tabulator: fakeTabulator([1, 1, ['c0']], 'row'), query: 'select id from cities' })

    expect(params.source).toBe('selection')
    expect(params.activeRange).toEqual({ rows: [2], columns: ['id'], value: [[2]] })
  })

  it('sends the table and its filters, not the loaded page, from a table view', () => {
    const filters = [{ field: 'city', type: '=', value: 'Seattle' }]
    const params = buildParamsForStatusbar({
      tabulator: fakeTabulator(),
      table: { name: 'cities', schema: 'public', entityType: 'table' },
      filters,
      where: `"city" = 'Seattle'`,
    })

    expect(params).toEqual({
      source: 'table',
      entity: { type: 'table', schema: 'public', name: 'cities' },
      filters,
      where: `"city" = 'Seattle'`,
    })
  })

  it('sends a selection from a table view along with the table', () => {
    const params = buildParamsForStatusbar({ tabulator: fakeTabulator([0, 1, ['c1']]), table: { name: 'cities' } })

    expect(params.source).toBe('selection')
    expect(params.activeRange?.value).toEqual([['Seattle'], ['Brooklyn']])
    expect(params.entity).toEqual({ type: 'table', schema: undefined, name: 'cities' })
  })
})
