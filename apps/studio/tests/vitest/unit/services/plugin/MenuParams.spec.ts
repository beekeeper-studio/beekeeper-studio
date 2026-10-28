import { describe, it, expect } from 'vitest'
import { buildParamsForStatusbar } from '@/services/plugin/web/MenuParams'

const result = {
  rows: [1, 2],
  columns: ['id', 'city'],
  value: [[1, 'Seattle'], [BigInt(2), 'Brooklyn']],
}

describe('buildParamsForStatusbar', () => {
  it('sends the whole result when nothing is selected', () => {
    const params = buildParamsForStatusbar({
      selection: null,
      result,
      query: 'select * from cities',
      truncated: true,
    })

    expect(params).toEqual({
      source: 'result',
      target: {
        type: 'corner',
        rows: [1, 2],
        columns: ['id', 'city'],
        // bigints are sent as numbers
        value: [[1, 'Seattle'], [2, 'Brooklyn']],
      },
      query: 'select * from cities',
      truncated: true,
    })
  })

  it('sends only the selection when one is made', () => {
    const params = buildParamsForStatusbar({
      selection: { rows: [2], columns: ['city'], value: [['Brooklyn']] },
      result,
      query: 'select 1',
    })

    expect(params.source).toBe('selection')
    expect(params.target).toEqual({ type: 'corner', rows: [2], columns: ['city'], value: [['Brooklyn']] })
    expect(params).not.toHaveProperty('activeRange')
  })

  it('sends the table and its filters, not the loaded page, from a table view', () => {
    const filters = [{ field: 'city', type: '=', value: 'Seattle' }]
    const params = buildParamsForStatusbar({
      selection: null,
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
    const params = buildParamsForStatusbar({
      selection: { rows: [1, 2], columns: ['city'], value: [['Seattle'], ['Brooklyn']] },
      table: { name: 'cities' },
    })

    expect(params.source).toBe('selection')
    expect(params.target?.value).toEqual([['Seattle'], ['Brooklyn']])
    expect(params.entity).toEqual({ type: 'table', schema: undefined, name: 'cities' })
  })
})
