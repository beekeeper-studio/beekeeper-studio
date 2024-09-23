
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";

type State = DataState<IConnectionFolder>

export const CloudConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null
  },
  mutations: mutationsFor<IConnectionFolder>({}, { field: 'name', direction: 'asc'}),
  actions: actionsFor<IConnectionFolder>('connectionFolders', {
    async poll() {
      // empty on purpose
    }
  })
}
