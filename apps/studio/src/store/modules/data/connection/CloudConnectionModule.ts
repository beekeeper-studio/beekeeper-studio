import { ICloudSavedConnection } from "@/common/interfaces/IConnection";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { havingCli } from "@/store/modules/data/StoreHelpers";
import _ from "lodash";

type State = DataState<ICloudSavedConnection>

export const CloudConnectionModule: DataStore<ICloudSavedConnection, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    filter: undefined,
    pendingSaveIds: []
  },
  mutations: mutationsFor<ICloudSavedConnection>({
    connectionFilter(state: State, str: string) {
      state.filter = str;
    }
  }, { field: 'name', direction: 'asc'}),
  actions: actionsFor<ICloudSavedConnection>('connections', {
    setConnectionFilter: _.debounce(function (context, filter) {
      context.commit('connectionFilter', filter);
    }, 500),
    async saveMany(context, items: ICloudSavedConnection[]) {
      // Mark items as pending to protect from poll overwrites
      items.forEach(item => context.commit('addPendingSave', item.id))
      context.commit('upsert', items)
      try {
        return await havingCli(context, async (cli) => {
          const saved = await Promise.all(items.map(item => cli.connections.upsert(item)))
          context.commit('upsert', saved)
        })
      } finally {
        // Clear pending status
        items.forEach(item => context.commit('removePendingSave', item.id))
      }
    },
    // Reorder action for drag/drop - uses dedicated reorder API that returns all affected positions
    async reorder(context, { item, position, connectionFolderId }) {
      // Get the full item from state for optimistic update
      const existing = context.state.items.find(c => c.id === item.id)
      if (!existing) return

      // Calculate optimistic numeric position
      let optimisticPosition = 1
      if (typeof position === 'object') {
        const siblings = context.state.items.filter(
          c => c.connectionFolderId === (connectionFolderId ?? existing.connectionFolderId)
        )
        if (position.after) {
          const afterItem = siblings.find(c => c.id === position.after)
          optimisticPosition = afterItem ? (afterItem.position ?? 0) + 0.5 : 1
        } else if (position.before) {
          const beforeItem = siblings.find(c => c.id === position.before)
          optimisticPosition = beforeItem ? Math.max(0, (beforeItem.position ?? 1) - 0.5) : 1
        } else {
          // { before: null } means first position
          const minPos = Math.min(...siblings.filter(c => c.id !== item.id).map(c => c.position ?? 1))
          optimisticPosition = Math.max(0, minPos - 1)
        }
      }

      // Mark as pending to protect from poll overwrites
      context.commit('addPendingSave', item.id)

      // Optimistic commit with numeric position
      context.commit('upsert', {
        ...existing,
        connectionFolderId: connectionFolderId ?? existing.connectionFolderId,
        position: optimisticPosition
      })

      // Use dedicated reorder API that returns all affected positions
      try {
        return await havingCli(context, async (cli) => {
          const affectedItems = await cli.connections.reorder(
            item.id,
            position,
            connectionFolderId
          )
          // Update all affected items with their new positions and folder
          affectedItems.forEach(affected => {
            const existing = context.state.items.find(c => c.id === affected.id)
            if (existing) {
              context.commit('upsert', {
                ...existing,
                position: affected.position,
                connectionFolderId: affected.connectionFolderId
              })
            }
          })
          return item.id
        })
      } finally {
        // Clear pending status
        context.commit('removePendingSave', item.id)
      }
    }
  }),
  getters: {
    filteredConnections(state) {
      if (!state.filter) {
        return state.items;
      }

      const startsWithFilter = _(state.items)
        .filter((item) => _.startsWith(item.name.toLowerCase(), state.filter))
        .value();

      const containsFilter = _(state.items)
        .difference(startsWithFilter)
        .filter((item) => item.name.toLowerCase().includes(state.filter.toLowerCase()))
        .value();

      return _.concat(startsWithFilter, containsFilter);
    }
  }
}
