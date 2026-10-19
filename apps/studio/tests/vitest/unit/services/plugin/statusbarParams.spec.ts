import { describe, it, expect, vi } from 'vitest'
import { buildParamsForStatusbar, onSelectedCellsChange, selectedRange } from '@/services/plugin/web/statusbarParams'

type Row = Record<string, unknown>

function column(field: string, title = field, visible = true) {
  return {
    getField: () => field,
    getDefinition: () => ({ title }),
    isVisible: () => visible,
  }
}

function row(data: Row, position: number) {
  return { getData: () => data, getPosition: () => position }
}

const columns = [
  column('--row-header--bks', ''),
  column('c0', 'id'),
  column('c1', 'city'),
  column('c2', 'hidden', false),
]
const data: Row[] = [
  { c0: 1, c1: 'Seattle', c2: 'x' },
  { c0: BigInt(2), c1: 'Brooklyn', c2: 'y' },
]

/** A tabulator stand-in. `selection` is [first row, last row, column fields] */
function fakeTabulator(selection?: [number, number, string[]]) {
  const rows = data.map((d, i) => row(d, i + 1))
  const ranges = selection
    ? [{
        getRows: () => rows.slice(selection[0], selection[1] + 1),
        getColumns: () => columns.filter((c) => selection[2].includes(c.getField())),
      }]
    : []
  return {
    getColumns: () => columns,
    getRows: () => rows,
    getRanges: () => ranges,
  } as any
}

describe('selectedRange', () => {
  it('ignores the single cell under the cursor', () => {
    expect(selectedRange(fakeTabulator([0, 0, ['c0']]))).toBeNull()
    expect(selectedRange(fakeTabulator())).toBeNull()
  })

  it('returns a range of two or more cells', () => {
    expect(selectedRange(fakeTabulator([0, 1, ['c0']]))).not.toBeNull()
  })

  it('does not count the row header column', () => {
    expect(selectedRange(fakeTabulator([0, 0, ['--row-header--bks', 'c0']]))).toBeNull()
  })
})

describe('buildParamsForStatusbar', () => {
  it('sends the whole result when nothing is selected', () => {
    const params = buildParamsForStatusbar({
      item: { tabulator: fakeTabulator([0, 0, ['c0']]), query: 'select * from cities', truncated: true },
    })

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
    const params = buildParamsForStatusbar({
      item: { tabulator: fakeTabulator([1, 1, ['c0', 'c1']]), query: 'select 1' },
    })

    expect(params.source).toBe('selection')
    expect(params.activeRange).toEqual({ rows: [2], columns: ['id', 'city'], value: [[2, 'Brooklyn']] })
  })

  it('sends the table and its filters, not the loaded page, from a table view', () => {
    const filters = [{ field: 'city', type: '=', value: 'Seattle' }]
    const params = buildParamsForStatusbar({
      item: {
        tabulator: fakeTabulator(),
        table: { name: 'cities', schema: 'public', entityType: 'table' },
        filters,
        where: `"city" = 'Seattle'`,
      },
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
      item: { tabulator: fakeTabulator([0, 1, ['c1']]), table: { name: 'cities' } },
    })

    expect(params.source).toBe('selection')
    expect(params.activeRange?.value).toEqual([['Seattle'], ['Brooklyn']])
    expect(params.entity).toEqual({ type: 'table', schema: undefined, name: 'cities' })
  })
})

describe('onSelectedCellsChange', () => {
  it('reports the size of the latest range on any range event, keyboard included', () => {
    vi.useFakeTimers()
    try {
      const listeners: Record<string, () => void> = {}
      let ranges: any[] = []
      const tabulator = {
        on: (event: string, fn: () => void) => { listeners[event] = fn },
        getRanges: () => ranges,
      } as any
      const callback = vi.fn()
      onSelectedCellsChange(tabulator, callback)

      // Shift+Arrow resizes a range without a mouse event
      ranges = fakeTabulator([0, 1, ['c0', 'c1']]).getRanges()
      listeners.rangeChanged()
      vi.advanceTimersByTime(100)
      expect(callback).toHaveBeenLastCalledWith(4)

      ranges = []
      listeners.rangeRemoved()
      vi.advanceTimersByTime(100)
      expect(callback).toHaveBeenLastCalledWith(0)

      expect(Object.keys(listeners).sort()).toEqual(['dataProcessed', 'rangeAdded', 'rangeChanged', 'rangeRemoved'])
    } finally {
      vi.useRealTimers()
    }
  })
})
