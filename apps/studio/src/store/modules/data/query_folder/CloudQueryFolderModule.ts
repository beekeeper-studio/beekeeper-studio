import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { buildTreeFolderNodes } from "@/common/utils/folderTree";
import { folderMoveActions } from "@/store/modules/data/move/moveStore";



type State = DataState<IQueryFolder>

export const CloudQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null
  },
  mutations: mutationsFor<IQueryFolder>({ ...accessGrantMutations() }, { field: 'name', direction: 'asc'}),
  actions: actionsFor<IQueryFolder>('queryFolders', {
    ...cloudAccessGrantActions('queryFolders'),
    ...folderMoveActions(),
    async poll() {
      // empty on purpose
    },
  }),
  getters: {
    nodes(state) {
      const nodes = buildTreeFolderNodes(state.items)
      for (const node of nodes) {
        // Disable dragging "Team" and "Personal" folders
        node.draggable = !!node.ref.parentId
      }
      return nodes
    }
  }
}
