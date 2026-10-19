import { describe, it, expect, vi } from 'vitest'
import { onSelectedCellsChange, selectedRange } from '@/common/tabulator'
import { fakeTabulator } from './fakeTabulator'

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
