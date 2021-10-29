import { DataState, mutationsFor, DataStore, actionsFor } from "../DataModuleBase";

import ISavedQuery from "@/common/interfaces/ISavedQuery";


interface State extends DataState<ISavedQuery> {
}

export const CloudQueryModule: DataStore<ISavedQuery, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<ISavedQuery>({
    // more mutations go here
  }),
  actions: actionsFor<ISavedQuery>('queries', {})
}