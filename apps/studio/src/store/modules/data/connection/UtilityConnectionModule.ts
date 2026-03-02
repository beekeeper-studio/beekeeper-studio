import { IConnection } from "@/common/interfaces/IConnection";
import { DataState, DataStore, mutationsFor, utilActionsFor } from "@/store/modules/data/DataModuleBase";
import _ from "lodash";
import Vue from "vue";

type State = DataState<IConnection>

export const UtilConnectionModule: DataStore<IConnection, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    filter: undefined,
    pendingSaveIds: []
  },
  mutations: mutationsFor<IConnection>({
    connectionFilter(state: DataState<IConnection>, str: string) {
      state.filter = str;
    }
  }),
  actions: utilActionsFor<IConnection>('saved', {
    setConnectionFilter: _.debounce(function (context, filter) {
      context.commit('connectionFilter', filter);
    }, 500),

    // Reorder action for drag/drop - matches cloud module interface
    async reorder(context, { item, position, connectionFolderId }) {
      const existing = context.state.items.find(c => c.id === item.id)
      if (!existing) return

      const targetFolderId = connectionFolderId ?? existing.connectionFolderId

      // Get all siblings in the target folder, sorted by position
      const siblings = context.state.items
        .filter(c => c.connectionFolderId === targetFolderId)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

      // Build the new ordered list
      let newOrder: IConnection[]
      const itemWithoutSelf = siblings.filter(c => c.id !== item.id)

      if (typeof position === 'object') {
        if (position.after) {
          const afterIndex = itemWithoutSelf.findIndex(c => c.id === position.after)
          newOrder = [
            ...itemWithoutSelf.slice(0, afterIndex + 1),
            { ...existing, connectionFolderId: targetFolderId },
            ...itemWithoutSelf.slice(afterIndex + 1)
          ]
        } else if (position.before) {
          const beforeIndex = itemWithoutSelf.findIndex(c => c.id === position.before)
          newOrder = [
            ...itemWithoutSelf.slice(0, beforeIndex),
            { ...existing, connectionFolderId: targetFolderId },
            ...itemWithoutSelf.slice(beforeIndex)
          ]
        } else {
          // { before: null } means first position
          newOrder = [{ ...existing, connectionFolderId: targetFolderId }, ...itemWithoutSelf]
        }
      } else {
        // Numeric position - insert at that index
        newOrder = [...itemWithoutSelf]
        newOrder.splice(position, 0, { ...existing, connectionFolderId: targetFolderId })
      }

      // Assign sequential positions
      const updates = newOrder.map((c, idx) => ({
        ...c,
        position: idx + 1
      }))

      // Optimistic update
      context.commit('upsert', updates)

      // Save all items
      const saved = await Promise.all(
        updates.map(c => Vue.prototype.$util.send('appdb/saved/save', { obj: c }))
      )
      context.commit('upsert', saved)

      return item.id
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
