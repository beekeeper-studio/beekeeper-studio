
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { buildFolderTree } from "@/common/utils/folderTree";
import { actions } from "../FolderHelpers";

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
    foldersWithConnections: (state) => (connections: any[]) =>
      buildFolderTree(state.items, connections, 'connectionFolderId'),
    personalRootId(state) {
      const root = state.items.find(
        (item) => !item.parentId && item.name === "Personal"
      );
      return root?.id;
    },
  },
  actions: actionsFor<IConnectionFolder>('connectionFolders', {
    ...actions,
    async poll() {
      // empty on purpose
    },
    async moveToFolder(context, { connection, folder }) {
      const updated = { ...connection, connectionFolderId: folder?.id ?? null }
      await context.dispatch('data/connections/save', updated, { root: true })
    }
  })
}
