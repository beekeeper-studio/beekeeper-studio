import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TabulatorFull } from 'tabulator-tables'
import { onSelectedCellsChange, selectedCells, selectedRange, tabulatorForTableInfo, visibleCells } from '@/common/tabulator'

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

/**
 * A tabulator stand-in. `selection` is [first row, last row, column fields].
 * `selecting` mirrors the range module's internal mode ("row" or "column"
 * after a header click); the last spec checks a real Tabulator still has it.
 */
function fakeTabulator(selection?: [number, number, string[]], selecting = 'cell') {
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
    modules: { selectRange: { selecting } },
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

  it('returns a row or column picked from its header, even when it is one cell', () => {
    // A row of a one-column result, a column of a one-row result
    expect(selectedRange(fakeTabulator([0, 0, ['c0']], 'row'))).not.toBeNull()
    expect(selectedRange(fakeTabulator([0, 0, ['c0']], 'column'))).not.toBeNull()
    expect(selectedRange(fakeTabulator([0, 0, ['c0']], 'all'))).not.toBeNull()
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

      // The cell under the cursor is not a selection
      ranges = fakeTabulator([0, 0, ['c0']]).getRanges()
      listeners.rangeChanged()
      vi.advanceTimersByTime(100)
      expect(callback).toHaveBeenLastCalledWith(0)

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

describe('selectedCells and visibleCells', () => {
  it('take the selected cells, leaving out internal columns', () => {
    expect(selectedCells(fakeTabulator([1, 1, ['--row-header--bks', 'c0', 'c1']]))).toEqual({
      rows: [2],
      columns: ['id', 'city'],
      value: [[BigInt(2), 'Brooklyn']],
    })
    expect(selectedCells(fakeTabulator([0, 0, ['c0']]))).toBeNull()
  })

  it('take every row in the visible data columns', () => {
    expect(visibleCells(fakeTabulator())).toEqual({
      rows: [1, 2],
      columns: ['id', 'city'],
      value: [[1, 'Seattle'], [BigInt(2), 'Brooklyn']],
    })
  })
})

describe('Tabulator internals', () => {
  // selectedRange reads the range module's `selecting` field, which is not
  // public API. This fails if an upgrade renames or removes it.
  it('still keeps the selection mode on the range module', async () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const table = new TabulatorFull(el, {
      data: [{ id: 1 }],
      columns: [{ field: 'id', title: 'id' }],
      selectableRange: true,
    })
    await new Promise((resolve) => table.on('tableBuilt', resolve))
    const selecting = (table as any).modules.selectRange?.selecting
    table.destroy()
    el.remove()
    expect(selecting).toBe('cell')
  })
})

// Regression coverage for #3172: Home/End did nothing in the column, relation
// and index name/comment editors.
describe('tabulatorForTableInfo', () => {
  let el: HTMLElement

  beforeEach(() => {
    el = document.createElement('div')
    document.body.appendChild(el)
  })

  afterEach(() => el.remove())

  // Cell editors are inputs inside the table element, which is where
  // Tabulator listens for its keybindings.
  function pressInTableInput(key: string) {
    const table = tabulatorForTableInfo(el, {
      data: [{ comment: 'hello' }],
      columns: [{ field: 'comment', editor: 'input' }],
    })
    return new Promise<KeyboardEvent>((resolve) => {
      table.on('tableBuilt', () => {
        const input = document.createElement('input')
        el.appendChild(input)
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        input.dispatchEvent(event)
        table.destroy()
        resolve(event)
      })
    })
  }

  it.each(['Home', 'End'])('does not swallow %s inside the table', async (key) => {
    const event = await pressInTableInput(key)
    expect(event.defaultPrevented).toBe(false)
  })
})
