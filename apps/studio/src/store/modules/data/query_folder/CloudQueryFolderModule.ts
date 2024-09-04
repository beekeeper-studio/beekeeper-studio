import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";



type State = DataState<IQueryFolder>

export const CloudQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null
  },
  mutations: mutationsFor<IQueryFolder>({}, { field: 'name', direction: 'asc'}),
  actions: actionsFor<IQueryFolder>('queryFolders', {
    async poll() {
      // empty on purpose
    }
  })
}
