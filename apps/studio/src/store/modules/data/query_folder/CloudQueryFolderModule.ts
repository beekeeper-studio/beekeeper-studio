import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { buildTreeFolderNodes } from "@/common/utils/folderTree";



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
  getters: {
    nodes(state) {
      const nodes = buildTreeFolderNodes(state.items)
      for (const node of nodes) {
        // Disable dragging "Team" and "Personal" folders
        node.draggable = !!node.ref.parentId
      }
      return nodes
    }
  },
  actions: actionsFor<IQueryFolder>('queryFolders', {
    ...cloudAccessGrantActions('queryFolders'),
    async poll() {
      // empty on purpose
    },
  })
}
