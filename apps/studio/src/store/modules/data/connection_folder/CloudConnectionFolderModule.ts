
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, accessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { FolderFetchModule, folderableActions, treeActions } from "@/store/modules/data/tree/treeStore";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";

type State = DataState<IConnectionFolder>;

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
    ...treeActions<IConnectionFolder>('parentIds'),
    ...folderableActions<IConnectionFolder>(),
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
    async poll() {
      // empty on purpose
    },
    async initialize() {
      // noop
    },
  },
}
