import { TransportUsedQuery } from "@/common/transport";
import { DataState, DataStore, mutationsFor, utilActionsFor } from "@/store/modules/data/DataModuleBase";

export const UtilUsedQueryModule: DataStore<TransportUsedQuery, DataState<TransportUsedQuery>> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null
  },
  mutations: mutationsFor<TransportUsedQuery>({

  }, { field: 'createdAt', direction: 'desc'}),
  actions: utilActionsFor<TransportUsedQuery>('usedQuery', {}, { take: 100, order: { createdAt: 'DESC' } })
}
