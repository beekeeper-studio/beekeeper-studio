import IUsedQuery from "@/common/interfaces/IUsedQuery";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";

type State = DataState<IUsedQuery>

export const CloudUsedQueryModule: DataStore<IUsedQuery, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null
  },
  mutations: mutationsFor<IUsedQuery>({}, { field: 'createdAt', direction: 'desc'}),
  actions: actionsFor<IUsedQuery>('usedQueries', {
    poll() {
      // don't poll for used queries
    }
  })
}