
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { buildTreeFolderNodes, FolderNodeWithRef } from "@/common/utils/folderTree";

type State = DataState<IConnectionFolder> & {
  listOptions?: Record<string, unknown>
  nodes: FolderNodeWithRef[]
};

export const CloudConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    listOptions: undefined,
    nodes: [],
  },
  mutations: mutationsFor<IConnectionFolder>({
    ...accessGrantMutations(),
    nodes(state, nodes) {
      state.nodes = nodes
    },
  }, { field: 'name', direction: 'asc'}),
  actions: actionsFor<IConnectionFolder>('connectionFolders', {
    ...cloudAccessGrantActions('connectionFolders'),
    async poll() {
      // empty on purpose
    },
    async afterMutate(context) {
      const nodes = buildTreeFolderNodes(context.state.items)
      for (const node of nodes) {
        // Disable dragging "Team" and "Personal" folders
        node.draggable = !!node.ref.parentId
      }
      context.commit('nodes', nodes)
    },
  })
}
