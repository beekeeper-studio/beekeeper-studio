import Vue from 'vue'
import _ from 'lodash'
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { DataState, DataStore, mutateActions, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { safely } from "@/store/modules/data/StoreHelpers";
import { accessGrantMutations, localAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { LocalWorkspace } from "@/common/interfaces/IWorkspace";
import { buildTreeFolderNodes, FolderNodeWithRef } from "@/common/utils/folderTree";

type State = DataState<IConnectionFolder> & {
  nodes: FolderNodeWithRef[]
}

export const LocalConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    nodes: [],
  },
  mutations: {
    ...mutationsFor<IConnectionFolder>({}, { field: 'name', direction: 'asc' }),
    ...accessGrantMutations(),
    nodes(state, nodes) {
      state.nodes = nodes
    },
  },
  actions: {
    ...localAccessGrantActions(),
    ...mutateActions<IConnectionFolder>(),
    async afterMutate(context) {
      context.commit('nodes', buildTreeFolderNodes(context.state.items))
    },
    async initialize(context) {
      await context.dispatch('load');
    },
    async load(context) {
      context.commit('error', null)
      await safely(context, async () => {
        const items = await Vue.prototype.$util.send('appdb/connectionFolder/find', { options: { order: { name: 'ASC' } } })
        if (context.rootState.workspaceId === LocalWorkspace.id) {
          await context.dispatch('mutate', { type: 'upsert', data: items })
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
      await context.dispatch('mutate', { type: 'upsert', data: updated })
      return updated.id
    },
    async remove(context, folder) {
      await Vue.prototype.$util.send('appdb/connectionFolder/remove', { obj: folder })
      await context.dispatch('mutate', { type: 'remove', data: folder })
    },
    async reload(context, id) {
      const item = await Vue.prototype.$util.send('appdb/connectionFolder/findOneBy', { options: { id } })
      if (item) {
        await context.dispatch('mutate', { type: 'upsert', data: item })
        return item.id
      }
      await context.dispatch('mutate', { type: 'remove', data: id })
      return null
    },
    async clone(_c, item) {
      const r = _.cloneDeep(item)
      r.id = null
      r.createdAt = null
      return r
    },
  }
}
