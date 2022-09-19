import { UsedQuery } from "@/common/appdb/models/used_query";
import { DataState, DataStore, localActionsFor, mutationsFor } from "@/store/modules/data/DataModuleBase";




interface State extends DataState<UsedQuery> {

}

export const LocalUsedQueryModule: DataStore<UsedQuery, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null
  },
  mutations: mutationsFor<UsedQuery>({

  }, { field: 'createdAt', direction: 'desc'}),
  actions: localActionsFor<UsedQuery>(UsedQuery, {}, { take: 100, order: { createdAt: 'DESC' } })
}
