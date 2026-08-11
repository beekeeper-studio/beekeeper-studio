import { ICloudSavedConnection } from "@/common/interfaces/IConnection";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { havingCli } from "@/store/modules/data/StoreHelpers";
import { accessGrantMutations, accessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { FolderFetchModule, treeActions } from "@/store/modules/data/tree/treeStore";
import { ItemNodeModule } from "@/store/modules/data/tree/ItemNodeModule";
import _ from "lodash";

type State = DataState<ICloudSavedConnection>;

export const CloudConnectionModule: DataStore<ICloudSavedConnection, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    filter: undefined,
    pendingSaveIds: [],
    searching: false,
  },
  mutations: mutationsFor<ICloudSavedConnection>({
    connectionFilter(state: State, str: string) {
      state.filter = str;
    },
    ...accessGrantMutations(),
  }, { field: 'name', direction: 'asc'}),
  modules: {
    nodes: ItemNodeModule('connectionFolderId', 'name'),
    folders: FolderFetchModule,
  },
  actions: {
    ...actionsFor<ICloudSavedConnection>('connections', {}),
    ...accessGrantActions('connections'),
    ...treeActions<ICloudSavedConnection>({ plural: 'connectionFolderIds', singular: 'connectionFolderId' }),
    async initialize() {
      // noop
    },
    async poll(context) {
      if (!context.rootState.connected) {
        const expandedFolderIds = context.rootState.sidebar.connections.expandedIds
        const result = await context.dispatch('loadByParentIds', expandedFolderIds)
        if (result.error) {
          context.commit("pollError", result.error);
        }
      }
    },
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
    setConnectionFilter: _.debounce(function (context, filter) {
      context.commit('connectionFilter', filter);
      context.dispatch('search', filter);
    }, 500),
    async saveMany(context, items: ICloudSavedConnection[]) {
      // Mark items as pending to protect from poll overwrites
      items.forEach(item => context.commit('addPendingSave', item.id))
      await context.dispatch('mutate', { type: 'upsert', data: items })
      try {
        return await havingCli(context, async (cli) => {
          const saved = await Promise.all(items.map(item => cli.connections.upsert(item)))
          await context.dispatch('mutate', { type: 'upsert', data: saved })
        })
      } finally {
        // Clear pending status
        items.forEach(item => context.commit('removePendingSave', item.id))
      }
    },
    // Reorder action for drag/drop - uses dedicated reorder API that returns all affected positions
    async reorder(context, { item, position, connectionFolderId, confirm }) {
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

      // Snapshot before any mutation (upsert mutates existing in-place via Object.assign)
      const snapshot = { ...existing }

      // Mark as pending to protect from poll overwrites
      context.commit('addPendingSave', item.id)

      // Optimistic commit with numeric position. Not awaited: `mutate` applies
      // both the item and node commits synchronously, and waiting would hold
      // the reorder request back a turn.
      context.dispatch('mutate', {
        type: 'upsert',
        data: {
          ...existing,
          connectionFolderId: connectionFolderId ?? existing.connectionFolderId,
          position: optimisticPosition
        }
      })

      // Use dedicated reorder API that returns all affected positions
      try {
        return await havingCli(context, async (cli) => {
          const affectedItems = await cli.connections.reorder(
            item.id,
            position,
            connectionFolderId,
            confirm
          )
          // Update all affected items with their new positions and folder
          for (const affected of affectedItems) {
            const existing = context.state.items.find(c => c.id === affected.id)
            if (existing) {
              await context.dispatch('mutate', {
                type: 'upsert',
                data: {
                  ...existing,
                  position: affected.position,
                  connectionFolderId: affected.connectionFolderId
                }
              })
            }
          }
          return item.id
        })
      } catch (e) {
        // Revert optimistic update using pre-mutation snapshot
        await context.dispatch('mutate', { type: 'upsert', data: snapshot })
        throw e
      } finally {
        // Clear pending status
        context.commit('removePendingSave', item.id)
      }
    }
  },
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
