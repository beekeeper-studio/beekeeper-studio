import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, accessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { FolderFetchModule, FolderableState, folderableActions, folderableMutations, treeActions } from "@/store/modules/data/tree/treeStore";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";

type State = DataState<IQueryFolder> & FolderableState<IQueryFolder>;

export const CloudQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    draft: null,
  },
  mutations: {
    ...mutationsFor<IQueryFolder>({}, { field: 'name', direction: 'asc'}),
    ...accessGrantMutations(),
    ...folderableMutations(),
  },
  modules: {
    nodes: FolderNodeModule,
    folders: FolderFetchModule,
  },
  actions: {
    ...actionsFor<IQueryFolder>('queryFolders', {}),
    ...accessGrantActions('queryFolders'),
    ...treeActions<IQueryFolder>('parentIds'),
    ...folderableActions<IQueryFolder>(),
    async initialize() {
      // noop
    },
    async poll() {
      // empty on purpose
    },
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
  },
}
