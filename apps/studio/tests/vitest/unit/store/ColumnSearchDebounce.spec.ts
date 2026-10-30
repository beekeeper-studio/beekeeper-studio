import { afterEach, describe, expect, it, vi } from 'vitest'
import store from '@/store'

describe('sidebar search debounce', () => {
  afterEach(() => vi.useRealTimers())

  it('searches again when rapid edits return to the previous term', async () => {
    vi.useFakeTimers()
    store.commit('newConnection', { connectionType: 'postgresql', defaultDatabase: 'db' })
    const executeQuery = vi.spyOn(store.state.connection, 'executeQuery').mockResolvedValue([{ rows: [{ schemaName: 'public', tableName: 'users', columnName: 'email' }] }])
    store.commit('filterQuery', 'email')
    store.commit('columnSearch/reset', '')
    store.dispatch('setFilterQuery', 'emails')
    store.dispatch('setFilterQuery', 'email')
    await vi.advanceTimersByTimeAsync(500)
    expect(executeQuery).toHaveBeenCalledTimes(1)
    expect(store.state.columnSearch.results).toHaveLength(1)
    executeQuery.mockRestore()
  })
})
