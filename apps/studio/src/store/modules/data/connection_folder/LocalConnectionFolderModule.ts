import Vue from 'vue'
import _ from 'lodash'
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { safely } from "@/store/modules/data/StoreHelpers";
import { LocalWorkspace } from "@/common/interfaces/IWorkspace";

type State = DataState<IConnectionFolder>

export const LocalConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: {
    ...mutationsFor<IConnectionFolder>({}, { field: 'name', direction: 'asc' }),
  },
  actions: {
    async load(context) {
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
    async remove(context, folder) {
      const items = await Vue.prototype.$util.send('appdb/saved/find', { options: { where: { connectionFolderId: folder.id } } })
      if (items.length > 0) {
        throw new Error(`Cannot delete "${folder.name}" — move or remove its ${items.length} connection${items.length === 1 ? '' : 's'} first.`)
      }
      await Vue.prototype.$util.send('appdb/connectionFolder/remove', { obj: folder })
      context.commit('remove', folder)
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
