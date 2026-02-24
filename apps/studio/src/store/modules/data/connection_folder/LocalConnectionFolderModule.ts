import Vue from 'vue'
import _ from 'lodash'
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { safely } from "@/store/modules/data/StoreHelpers";
import { LocalWorkspace } from "@/common/interfaces/IWorkspace";

interface State extends DataState<IConnectionFolder> {
  unsupported: boolean
}

export const LocalConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    unsupported: true
  },
  mutations: {
    ...mutationsFor<IConnectionFolder>({}, { field: 'name', direction: 'asc' }),
    setUnsupported(state, v: boolean) { state.unsupported = v }
  },
  actions: {
    async load(context) {
      if (!context.rootGetters.isUltimate) {
        context.commit('setUnsupported', true)
        return
      }
      context.commit('setUnsupported', false)
      context.commit('error', null)
      await safely(context, async () => {
        const items = await Vue.prototype.$util.send('appdb/connectionFolder/find', { options: { order: { name: 'ASC' } } })
        if (context.rootState.workspaceId === LocalWorkspace.id) {
          context.commit('upsert', items)
        }
      })
    },
    async poll() {
      // no-op for local
    },
    async clearError(context) {
      context.commit('error', null)
    },
    async save(context, item) {
      const updated = await Vue.prototype.$util.send('appdb/connectionFolder/save', { obj: item })
      context.commit('upsert', updated)
      return updated.id
    },
    async remove(context, item) {
      await Vue.prototype.$util.send('appdb/connectionFolder/remove', { obj: item })
      context.commit('remove', item)
    },
    async reload(context, id) {
      const item = await Vue.prototype.$util.send('appdb/connectionFolder/findOneBy', { options: { id } })
      if (item) {
        context.commit('upsert', item)
        return item.id
      }
      context.commit('remove', id)
      return null
    },
    async clone(_c, item) {
      const r = _.cloneDeep(item)
      r.id = null
      r.createdAt = null
      return r
    }
  }
}
