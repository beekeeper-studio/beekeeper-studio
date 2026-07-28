
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { folderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";

type State = DataState<IConnectionFolder>;

export const CloudConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    listOptions: undefined,
  },
  mutations: mutationsFor<IConnectionFolder>({
    ...accessGrantMutations(),
  }, { field: 'name', direction: 'asc'}),
  modules: {
    nodes: folderNodeModule,
  },
  actions: actionsFor<IConnectionFolder>('connectionFolders', {
    ...cloudAccessGrantActions('connectionFolders'),
    async poll() {
      // empty on purpose
    },
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
  })
}
