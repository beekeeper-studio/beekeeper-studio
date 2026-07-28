
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { buildTreeFolderNodes } from "@/common/utils/folderTree";

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
    nodes(state) {
      const nodes = buildTreeFolderNodes(state.items)
      for (const node of nodes) {
        // Disable dragging "Team" and "Personal" folders
        node.draggable = !!node.ref.parentId
      }
      return nodes
    },
  },
  actions: actionsFor<IConnectionFolder>('connectionFolders', {
    ...cloudAccessGrantActions('connectionFolders'),
    async poll() {
      // empty on purpose
    },
  })
}
