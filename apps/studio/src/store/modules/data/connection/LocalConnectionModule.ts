import { SavedConnection } from "@/common/appdb/models/saved_connection";
import { DataState, DataStore, localActionsFor, mutationsFor } from "@/store/modules/data/DataModuleBase";
import _ from "lodash";


interface State extends DataState<SavedConnection> {

}


export const LocalConnectionModule: DataStore<SavedConnection, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null
  },
  mutations: mutationsFor<SavedConnection>({

  }),
  actions: localActionsFor<SavedConnection>(SavedConnection, {})

}