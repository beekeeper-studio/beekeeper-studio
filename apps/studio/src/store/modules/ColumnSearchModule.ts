import { buildColumnSearchQuery, ColumnSearchRequests, ColumnSearchResult } from '@/lib/db/columnSearch'

export const ColumnSearchModule = {
  namespaced: true,
  state: () => ({ enabled: true, results: [] as ColumnSearchResult[], query: '', error: null as string | null, requests: new ColumnSearchRequests() }),
  mutations: {
    setEnabled(state, enabled: boolean) { state.enabled = enabled },
    reset(state, query: string) {
      state.requests.invalidate()
      state.query = query
      state.results = []
      state.error = null
    },
    results(state, rows: ColumnSearchResult[]) { state.results = rows },
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
      commit('reset', query || '')
      if (!state.enabled) return
      const sql = buildColumnSearchQuery(dialect, query)
      if (!sql) return
      const connection = rootState.connection
      const database = rootState.database
      try {
        const result = await state.requests.run(() => connection.executeQuery(sql))
        if (result && connection === rootState.connection && database === rootState.database && state.query === query) {
          commit('results', result[0]?.rows || [])
        }
      } catch (error) {
        if (connection === rootState.connection && database === rootState.database && state.query === query) {
          commit('error', error instanceof Error ? error.message : String(error))
        }
      }
    },
  },
}
