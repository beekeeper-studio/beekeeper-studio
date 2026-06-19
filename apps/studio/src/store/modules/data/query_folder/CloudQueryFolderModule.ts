import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { buildFolderTree } from "@/common/utils/folderTree";



type State = DataState<IQueryFolder>

export const CloudQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null
  },
  mutations: mutationsFor<IQueryFolder>({}, { field: 'name', direction: 'asc'}),
  getters: {
    foldersWithQueries: (state) => (queries: any[]) =>
      buildFolderTree(state.items, queries, 'queryFolderId')
  },
  actions: actionsFor<IQueryFolder>('queryFolders', {
    async poll() {
      // empty on purpose
    },
    async moveToFolder(context, { query, folder }) {
      const updated = { ...query, queryFolderId: folder?.id ?? null }
      await context.dispatch('data/queries/save', updated, { root: true })
    }
  })
}
