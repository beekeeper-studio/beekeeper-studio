import Vue from 'vue'
import _ from 'lodash'
import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { safely } from "@/store/modules/data/StoreHelpers";
import { accessGrantMutations, localAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { LocalWorkspace } from "@/common/interfaces/IWorkspace";
import { buildTreeFolderNodes } from "@/common/folderTree";
import { folderMoveActions } from "@/store/modules/data/move/moveStore";

type State = DataState<IQueryFolder>

export const LocalQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: {
    ...mutationsFor<IQueryFolder>({}, { field: 'name', direction: 'asc' }),
    ...accessGrantMutations(),
  },
  actions: {
    ...localAccessGrantActions(),
    ...folderMoveActions(),
    async initialize(context) {
      context.dispatch('load');
    },
    async load(context) {
      context.commit('error', null)
      await safely(context, async () => {
        const items = await Vue.prototype.$util.send('appdb/queryFolder/find', { options: { order: { name: 'ASC' } } })
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
      const updated = await Vue.prototype.$util.send('appdb/queryFolder/save', { obj: item })
      context.commit('upsert', updated)
      return updated.id
    },
    async remove(context, folder) {
      await Vue.prototype.$util.send('appdb/queryFolder/remove', { obj: folder })
      context.commit('remove', folder)
    },
    async reload(context, id) {
      const item = await Vue.prototype.$util.send('appdb/queryFolder/findOneBy', { options: { id } })
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
    },
  },
  getters: {
    nodes(state) {
      return buildTreeFolderNodes(state.items)
    }
  }
}
