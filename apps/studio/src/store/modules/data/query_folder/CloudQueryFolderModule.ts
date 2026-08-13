import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, accessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { FolderFetchModule, treeActions } from "@/store/modules/data/tree/treeStore";
import { FolderableState, folderableActions } from "@/store/modules/data/tree/folderableStore";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";

type State = DataState<IQueryFolder> & FolderableState<IQueryFolder>;

export const CloudQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: {
    ...mutationsFor<IQueryFolder>({}, { field: 'name', direction: 'asc'}),
    ...accessGrantMutations(),
  },
  modules: {
    nodes: FolderNodeModule,
    folders: FolderFetchModule,
  },
  actions: {
    ...actionsFor<IQueryFolder>('queryFolders', {}),
    ...accessGrantActions('queryFolders'),
    ...treeActions<IQueryFolder>({ plural: 'parentIds', singular: 'parentId' }),
    ...folderableActions<IQueryFolder>(),
    async initialize() {
      // noop
    },
    async poll(context) {
      if (
          context.rootState.connected
          && context.rootState.sidebar.globalSidebarActiveItem === "queries"
          && context.rootState.sidebar.primarySidebarOpen
      ) {
        const expandedFolderIds = context.rootState.sidebar.queries.expandedIds
        const result = await context.dispatch('loadByParentIds', expandedFolderIds)
        if (result.error) {
          context.commit("pollError", result.error);
        }
      }
    },
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
  },
}
