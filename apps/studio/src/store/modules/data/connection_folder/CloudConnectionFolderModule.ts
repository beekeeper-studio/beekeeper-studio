
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { buildFolderTree } from "@/common/utils/folderTree";

type State = DataState<IConnectionFolder>

export const CloudConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null
  },
  mutations: mutationsFor<IConnectionFolder>({ ...accessGrantMutations() }, { field: 'name', direction: 'asc'}),
  getters: {
    foldersWithConnections: (state) => (connections: any[]) =>
      buildFolderTree(state.items, connections, 'connectionFolderId')
  },
  actions: actionsFor<IConnectionFolder>('connectionFolders', {
    ...cloudAccessGrantActions('connectionFolders'),
    async poll() {
      // empty on purpose
    },
    async moveToFolder(context, { connection, folder }) {
      const updated = { ...connection, connectionFolderId: folder?.id ?? null }
      await context.dispatch('data/connections/save', updated, { root: true })
    }
  })
}
