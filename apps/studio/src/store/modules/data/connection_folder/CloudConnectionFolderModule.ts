
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";

type State = DataState<IConnectionFolder>

export const CloudConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null
  },
  mutations: mutationsFor<IConnectionFolder>({}, { field: 'name', direction: 'asc'}),
  getters: {
    foldersWithConnections: (state) => (connections: any[]) => {
      const byPosition = (a: any, b: any) => a.position - b.position
      const rootFolders = state.items.filter((f) => !f.parentId)
      return rootFolders.map((folder) => ({
        folder,
        connections: connections.filter((c) => c.connectionFolderId === folder.id).sort(byPosition),
        subfolders: state.items
          .filter((f) => f.parentId === folder.id)
          .map((subfolder) => ({
            folder: subfolder,
            connections: connections.filter((c) => c.connectionFolderId === subfolder.id).sort(byPosition)
          }))
      }))
    }
  },
  actions: actionsFor<IConnectionFolder>('connectionFolders', {
    async poll() {
      // empty on purpose
    },
    async moveToFolder(context, { connection, folder }) {
      const updated = { ...connection, connectionFolderId: folder?.id ?? null }
      await context.dispatch('data/connections/save', updated, { root: true })
    }
  })
}
