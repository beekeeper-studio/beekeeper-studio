import { TransportFavoriteQuery } from '@/common/transport';
import _ from 'lodash'
import Vue from 'vue'
import { mutationsFor, DataState, DataStore, utilActionsFor } from '../DataModuleBase'
import { accessGrantActions, accessGrantMutations } from '@/store/modules/data/access_grant/accessGrantStore'
import { FolderFetchModule, treeActions } from "@/store/modules/data/tree/treeStore";
import { ItemNodeModule } from "@/store/modules/data/tree/ItemNodeModule";

type State = DataState<TransportFavoriteQuery>

export const UtilQueryModule: DataStore<TransportFavoriteQuery, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    filter: undefined, // maybe this can be more advanced? date filter?
    pendingSaveIds: [],
  },
  mutations: mutationsFor<TransportFavoriteQuery>({
    // more mutations go here
    savedQueryFilter(state: DataState<TransportFavoriteQuery>, str: string) {
      state.filter = str;
    },
    ...accessGrantMutations(),
  }, { field: 'title', direction : 'asc'}),
  modules: {
    nodes: ItemNodeModule('queryFolderId', 'title'),
    folders: FolderFetchModule,
  },
  actions: {
    ...utilActionsFor<TransportFavoriteQuery>('query', {}, {}, { text: true, title: true, database: true, excerpt: true, id: true }),
    ...accessGrantActions('queries'),
    ...treeActions<TransportFavoriteQuery>({ plural: 'queryFolderIds', singular: 'queryFolderId' }),
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
    async refresh(context) {
      await context.dispatch('load');
    },
    setSavedQueryFilter: _.debounce(function (context, filter) {
      context.commit('savedQueryFilter', filter);
    }, 500),

    // Reorder action for drag/drop - matches cloud module interface
    async reorder(context, { item, position, queryFolderId }) {
      const existing = context.state.items.find(q => q.id === item.id)
      if (!existing) return

      const targetFolderId = queryFolderId !== undefined ? queryFolderId : existing.queryFolderId

      // Get all siblings in the target folder, sorted by position
      const siblings = context.state.items
        .filter(q => q.queryFolderId === targetFolderId)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

      // Build the new ordered list
      let newOrder: TransportFavoriteQuery[]
      const itemWithoutSelf = siblings.filter(q => q.id !== item.id)

      if (typeof position === 'object') {
        if (position.after) {
          const afterIndex = itemWithoutSelf.findIndex(q => q.id === position.after)
          newOrder = [
            ...itemWithoutSelf.slice(0, afterIndex + 1),
            { ...existing, queryFolderId: targetFolderId },
            ...itemWithoutSelf.slice(afterIndex + 1)
          ]
        } else if (position.before) {
          const beforeIndex = itemWithoutSelf.findIndex(q => q.id === position.before)
          newOrder = [
            ...itemWithoutSelf.slice(0, beforeIndex),
            { ...existing, queryFolderId: targetFolderId },
            ...itemWithoutSelf.slice(beforeIndex)
          ]
        } else {
          // { before: null } means first position
          newOrder = [{ ...existing, queryFolderId: targetFolderId }, ...itemWithoutSelf]
        }
      } else {
        // Numeric position - insert at that index
        newOrder = [...itemWithoutSelf]
        newOrder.splice(position, 0, { ...existing, queryFolderId: targetFolderId })
      }

      // Assign sequential positions
      const updates = newOrder.map((q, idx) => ({
        ...q,
        position: idx + 1
      }))

      // Snapshot affected items before mutation (upsert mutates in-place via Object.assign)
      const affectedIds = new Set(updates.map(q => q.id))
      const snapshot = context.state.items
        .filter(q => affectedIds.has(q.id))
        .map(q => ({ ...q }))

      // Optimistic update
      await context.dispatch('mutate', { type: 'upsert', data: updates })

      try {
        // Save all items
        const saved = await Promise.all(
          updates.map(q => Vue.prototype.$util.send('appdb/query/save', { obj: q }))
        )
        await context.dispatch('mutate', { type: 'upsert', data: saved })
      } catch (e) {
        // Revert optimistic update using pre-mutation snapshots
        await context.dispatch('mutate', { type: 'upsert', data: snapshot })
        throw e
      }

      return item.id
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
