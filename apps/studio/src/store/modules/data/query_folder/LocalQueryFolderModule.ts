import Vue from 'vue'
import _ from 'lodash'
import pluralize from 'pluralize'
import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { safely } from "@/store/modules/data/StoreHelpers";
import { LocalWorkspace } from "@/common/interfaces/IWorkspace";

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
  },
  getters: {
    foldersWithQueries: (state) => (queries: any[]) => {
      const byPosition = (a: any, b: any) => a.position - b.position
      const rootFolders = state.items.filter((f) => !f.parentId)
      return rootFolders.map((folder) => ({
        folder,
        queries: queries.filter((q) => q.queryFolderId === folder.id).sort(byPosition),
        subfolders: state.items
          .filter((f) => f.parentId === folder.id)
          .map((subfolder) => ({
            folder: subfolder,
            queries: queries.filter((q) => q.queryFolderId === subfolder.id).sort(byPosition)
          }))
      }))
    }
  },
  actions: {
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
      const items = await Vue.prototype.$util.send('appdb/query/find', { options: { where: { queryFolderId: folder.id } } })
      if (items.length > 0) {
        throw new Error(`Cannot delete "${folder.name}" — move or remove its ${pluralize('query', items.length, true)} first.`)
      }
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
    async moveToFolder(context, { query, folder }) {
      const updated = { ...query, queryFolderId: folder?.id ?? null }
      await context.dispatch('data/queries/save', updated, { root: true })
    }
  }
}
