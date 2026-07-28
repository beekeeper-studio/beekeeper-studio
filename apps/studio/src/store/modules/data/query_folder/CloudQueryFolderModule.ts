import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { folderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";



type State = DataState<IQueryFolder>;

export const CloudQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    listOptions: undefined,
  },
  mutations: mutationsFor<IQueryFolder>({
    ...accessGrantMutations(),
  }, { field: 'name', direction: 'asc'}),
  modules: {
    nodes: folderNodeModule,
  },
  actions: actionsFor<IQueryFolder>('queryFolders', {
    ...cloudAccessGrantActions('queryFolders'),
    async poll() {
      // empty on purpose
    },
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
  })
}
