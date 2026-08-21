import Vue from 'vue'
import _ from 'lodash'
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { DataState, DataStore, LoadOptions, mutateActions, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { safely } from "@/store/modules/data/StoreHelpers";
import { accessGrantActions, accessGrantMutations } from "@/store/modules/data/access_grant/accessGrantStore";
import { LocalWorkspace } from "@/common/interfaces/IWorkspace";
import { FolderFetchModule, treeActions } from "@/store/modules/data/tree/treeStore";
import { FolderableState, folderableActions } from "@/store/modules/data/tree/folderableStore";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";

type State = DataState<IConnectionFolder> & FolderableState<IConnectionFolder>

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
    ...accessGrantMutations(),
  },
  modules: {
    nodes: FolderNodeModule,
    folders: FolderFetchModule,
  },
  actions: {
    ...accessGrantActions('connectionFolders'),
    ...mutateActions<IConnectionFolder>(),
    ...treeActions<IConnectionFolder>({ plural: 'parentIds', singular: 'parentId' }),
    ...folderableActions<IConnectionFolder>(),
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
    async initialize() {
      // noop
    },
    async load(context, options: LoadOptions<IConnectionFolder> = {}) {
      context.commit('error', null)
      await safely(context, async () => {
        const items = await Vue.prototype.$util.send('appdb/connectionFolder/find', { options: { order: { name: 'ASC' } } })
        if (context.rootState.workspaceId === LocalWorkspace.id) {
          await context.dispatch('mutate', { type: 'upsert', data: items })
        }
      }, options.onError)
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
