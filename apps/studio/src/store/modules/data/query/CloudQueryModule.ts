import { DataState, mutationsFor, DataStore, actionsFor } from "../DataModuleBase";
import { havingCli } from "../StoreHelpers";
import { accessGrantMutations, accessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import _ from 'lodash'
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { FolderFetchModule, treeActions } from "@/store/modules/data/tree/treeStore";
import { ItemNodeModule } from "@/store/modules/data/tree/ItemNodeModule";


type State = DataState<ISavedQuery>;

export const CloudQueryModule: DataStore<ISavedQuery, State> = {
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
  mutations: mutationsFor<ISavedQuery>({
    // more mutations go here
    savedQueryFilter(state: State, str: string) {
      state.filter = str;
    },
    ...accessGrantMutations(),
  }, { field: 'title', direction: 'asc'}),
  modules: {
    nodes: ItemNodeModule('queryFolderId', 'title'),
    folders: FolderFetchModule,
  },
  actions: {
    ...actionsFor<ISavedQuery>('queries', {}),
    ...accessGrantActions('queries'),
    ...treeActions<ISavedQuery>({ plural: 'queryFolderIds', singular: 'queryFolderId' }),
    async initialize() {
      // noop
    },
    async poll(context) {
      if (
          context.rootState.connected
          && context.rootState.sidebar.globalSidebarActiveItem === "queries"
          && context.rootState.sidebar.primarySidebarOpen
      ) {
        const expandedFolderIds = context.rootState.sidebar.queries.expandedIds
        const result = await context.dispatch('loadByParentIds', expandedFolderIds)
        if (result.error) {
          context.commit("pollError", result.error);
        }
      }
    },
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
    setSavedQueryFilter: _.debounce(function (context, filter) {
      context.commit('savedQueryFilter', filter);
      context.dispatch('search', filter);
    }, 500),
    async saveMany(context, items: ISavedQuery[]) {
      // Mark items as pending to protect from poll overwrites
      items.forEach(item => context.commit('addPendingSave', item.id))
      await context.dispatch('mutate', { type: 'upsert', data: items })
      try {
        return await havingCli(context, async (cli) => {
          const saved = await Promise.all(items.map(item => cli.queries.upsert(item)))
          await context.dispatch('mutate', { type: 'upsert', data: saved })
        })
      } finally {
        // Clear pending status
        items.forEach(item => context.commit('removePendingSave', item.id))
      }
    },
    // Reorder action for drag/drop - uses dedicated reorder API that returns all affected positions
    async reorder(context, { item, position, queryFolderId, confirm }) {
      // Get the full item from state for optimistic update
      const existing = context.state.items.find(q => q.id === item.id)
      if (!existing) return

      // Calculate optimistic numeric position
      let optimisticPosition = 1
      if (typeof position === 'object') {
        const siblings = context.state.items.filter(
          q => q.queryFolderId === (queryFolderId ?? existing.queryFolderId)
        )
        if (position.after) {
          const afterItem = siblings.find(q => q.id === position.after)
          optimisticPosition = afterItem ? (afterItem.position ?? 0) + 0.5 : 1
        } else if (position.before) {
          const beforeItem = siblings.find(q => q.id === position.before)
          optimisticPosition = beforeItem ? Math.max(0, (beforeItem.position ?? 1) - 0.5) : 1
        } else {
          // { before: null } means first position
          const minPos = Math.min(...siblings.filter(q => q.id !== item.id).map(q => q.position ?? 1))
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
          queryFolderId: queryFolderId ?? existing.queryFolderId,
          position: optimisticPosition
        }
      })

      // Use dedicated reorder API that returns all affected positions
      try {
        return await havingCli(context, async (cli) => {
          const affectedItems = await cli.queries.reorder(
            item.id,
            position,
            queryFolderId,
            confirm
          )
          // Update all affected items with their new positions and folder
          for (const affected of affectedItems) {
            const existing = context.state.items.find(q => q.id === affected.id)
            if (existing) {
              await context.dispatch('mutate', {
                type: 'upsert',
                data: {
                  ...existing,
                  position: affected.position,
                  queryFolderId: affected.queryFolderId
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
    filteredQueries(state) {
      if (!state.filter) {
        return state.items;
      }

      const startsWithFilter = _(state.items)
        .filter((item) => _.startsWith(item.title.toLowerCase(), state.filter))
        .value();

      const containsFilter = _(state.items)
        .difference(startsWithFilter)
        .filter((item) => item.title.toLowerCase().includes(state.filter.toLowerCase()))
        .value();

      return _.concat(startsWithFilter, containsFilter);
    }
  }
}
