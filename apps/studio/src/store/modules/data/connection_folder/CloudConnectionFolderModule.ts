
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, accessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { FolderFetchModule, treeActions } from "@/store/modules/data/tree/treeStore";
import { FolderableState, folderableActions } from "@/store/modules/data/tree/folderableStore";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";

type State = DataState<IConnectionFolder> & FolderableState<IConnectionFolder>;

export const CloudConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: {
    ...mutationsFor<IConnectionFolder>({}, { field: 'name', direction: 'asc'}),
    ...accessGrantMutations(),
  },
  modules: {
    nodes: FolderNodeModule,
    folders: FolderFetchModule,
  },
  actions: {
    ...actionsFor<IConnectionFolder>('connectionFolders', {}),
    ...accessGrantActions('connectionFolders'),
    ...treeActions<IConnectionFolder>({ plural: 'parentIds', singular: 'parentId' }),
    ...folderableActions<IConnectionFolder>(),
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
    async poll(context) {
      if (!context.rootState.connected) {
        const expandedFolderIds = context.rootState.sidebar.connections.expandedIds
        const result = await context.dispatch('loadByParentIds', expandedFolderIds)
        if (result.error) {
          context.commit("pollError", result.error);
        }
      }
    },
    async initialize() {
      // noop
    },
  },
}
