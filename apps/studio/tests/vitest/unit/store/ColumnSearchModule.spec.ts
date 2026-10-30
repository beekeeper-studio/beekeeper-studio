import { describe, expect, it, vi } from 'vitest'
import Vue from 'vue'
import Vuex from 'vuex'
import { ColumnSearchModule } from '@/store/modules/ColumnSearchModule'

Vue.use(Vuex)

describe('sidebar column search', () => {
  it('disables pending and future searches and searches again when enabled', async () => {
    let finish: (value: any) => void
    const executeQuery = vi.fn()
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
      .mockResolvedValue([{ rows: [{ columnName: 'email' }] }])
    const store = new Vuex.Store({
      state: { database: 'db', connection: { executeQuery }, entityFilter: { filterQuery: 'email' } },
      getters: { dialect: () => 'postgresql' },
      modules: { columnSearch: ColumnSearchModule },
    })
    const pending = store.dispatch('columnSearch/search', { query: 'email', dialect: 'postgresql' })
    await store.dispatch('columnSearch/setEnabled', false)
    finish([{ rows: [{ columnName: 'stale' }] }])
    await pending
    await store.dispatch('columnSearch/search', { query: 'email', dialect: 'postgresql' })
    expect(store.state.columnSearch.results).toEqual([])
    expect(executeQuery).toHaveBeenCalledTimes(1)
    await store.dispatch('columnSearch/setEnabled', true)
    expect(executeQuery).toHaveBeenCalledTimes(2)
    expect(store.state.columnSearch.results[0].columnName).toBe('email')
  })
  it('loads matching columns in one query and clears them when the search is cleared', async () => {
    const executeQuery = vi.fn().mockResolvedValue([{ rows: [{ schemaName: 'public', tableName: 'users', columnName: 'email', dataType: 'text' }] }])
    const store = new Vuex.Store({ state: { database: 'db', connection: { executeQuery } }, modules: { columnSearch: ColumnSearchModule } })
    await store.dispatch('columnSearch/search', { query: 'email', dialect: 'postgresql' })
    expect(executeQuery).toHaveBeenCalledTimes(1)
    expect(store.state.columnSearch.results[0].columnName).toBe('email')
    await store.dispatch('columnSearch/search', { query: '', dialect: 'postgresql' })
    expect(store.state.columnSearch.results).toEqual([])
  })

  it('does not publish an old response after the selected database changes', async () => {
    let finish: (value: any) => void
    const executeQuery = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const store = new Vuex.Store({ state: { database: 'db', connection: { executeQuery } }, modules: { columnSearch: ColumnSearchModule } })
    const pending = store.dispatch('columnSearch/search', { query: 'email', dialect: 'postgresql' })
    store.state.database = 'other'
    finish([{ rows: [{ columnName: 'email' }] }])
    await pending
    expect(store.state.columnSearch.results).toEqual([])
  })

  it('keeps name filtering usable when the metadata query fails', async () => {
    const executeQuery = vi.fn().mockRejectedValue(new Error('access denied'))
    const store = new Vuex.Store({ state: { database: 'db', connection: { executeQuery } }, modules: { columnSearch: ColumnSearchModule } })
    await store.dispatch('columnSearch/search', { query: 'email', dialect: 'postgresql' })
    expect(store.state.columnSearch.results).toEqual([])
    expect(store.state.columnSearch.error).toBe('access denied')
  })
})
