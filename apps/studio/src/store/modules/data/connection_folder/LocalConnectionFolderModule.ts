import Vue from 'vue'
import _ from 'lodash'
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { DataState, DataStore, mutateActions, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { safely } from "@/store/modules/data/StoreHelpers";
import { accessGrantMutations, localAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { LocalWorkspace } from "@/common/interfaces/IWorkspace";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";
import { SidebarModule } from "@/store/modules/data/tree/SidebarModule";

type State = DataState<IConnectionFolder> & {
  /** The default folders are being fetched. */
  initializing: boolean;
  /** Folders whose children are being fetched right now. */
  fetchingIds: number[];
}

export const LocalConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    initializing: false,
    fetchingIds: [],
  },
  mutations: {
    ...mutationsFor<IConnectionFolder>({}, { field: 'name', direction: 'asc' }),
    ...accessGrantMutations(),
    initializing(state, initializing: boolean) {
      state.initializing = initializing
    },
    fetchingIds(state, ids: number[]) {
      state.fetchingIds = ids
    },
  },
  modules: {
    nodes: FolderNodeModule,
    sidebar: SidebarModule,
  },
  actions: {
    ...localAccessGrantActions(),
    ...mutateActions<IConnectionFolder>(),
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
    async initialize(context) {
      context.commit('sidebar/expandedIds', []);
      context.commit('initializing', true);
      try {
        await context.dispatch('load');
      } finally {
        context.commit('initializing', false);
      }
    },
    async ensureLoaded() {
      // noop
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
