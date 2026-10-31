import { buildColumnSearchQuery, ColumnSearchRequests, ColumnSearchResult, supportsColumnSearch } from '@/lib/db/columnSearch'

export const ColumnSearchModule = {
  namespaced: true,
  state: () => ({ enabled: true, results: [] as ColumnSearchResult[], query: '', error: null as string | null, requests: new ColumnSearchRequests(), completed: false, completedDatabase: null, completedConnection: null, completedDialect: '' }),
  mutations: {
    setEnabled(state, enabled: boolean) { state.enabled = enabled },
    invalidate(state) { state.requests.invalidate() },
    reset(state, query: string) {
      state.requests.invalidate()
      state.query = query
      state.results = []
      state.error = null
      state.completed = false
    },
    results(state, { rows, database, connection, dialect }) {
      state.results = rows
      state.completed = true
      state.completedDatabase = database
      state.completedConnection = connection
      state.completedDialect = dialect
    },
    error(state, error: string) { state.error = error },
  },
  actions: {
    async setEnabled({ commit, dispatch, rootState, rootGetters }, enabled: boolean) {
      commit('setEnabled', enabled)
      if (enabled) {
        await dispatch('search', { query: rootState.entityFilter.filterQuery, dialect: rootGetters.dialect })
      } else {
        commit('reset', '')
      }
    },
    async search({ state, rootState, commit }, { query, dialect }: { query: string, dialect: string }) {
      if (!state.enabled || !supportsColumnSearch(rootState.connectionType)) {
        commit('reset', query || '')
        return
      }
      if (state.enabled && state.completed && query === state.query && dialect === state.completedDialect &&
          rootState.database === state.completedDatabase && rootState.connection === state.completedConnection) return
      commit('reset', query || '')
      const sql = buildColumnSearchQuery(dialect, query)
      if (!sql) return
      const connection = rootState.connection
      const database = rootState.database
      try {
        const result = await state.requests.run(() => connection.executeQuery(sql))
        if (result && connection === rootState.connection && database === rootState.database && state.query === query) {
          commit('results', { rows: result[0]?.rows || [], database, connection, dialect })
        }
      } catch (error) {
        if (connection === rootState.connection && database === rootState.database && state.query === query) {
          commit('error', error instanceof Error ? error.message : String(error))
        }
      }
    },
  },
}
