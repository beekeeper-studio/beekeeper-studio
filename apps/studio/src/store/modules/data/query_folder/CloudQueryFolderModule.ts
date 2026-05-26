import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";



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
