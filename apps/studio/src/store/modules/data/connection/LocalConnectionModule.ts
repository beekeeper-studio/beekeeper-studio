import { SavedConnection } from "@/common/appdb/models/saved_connection";
import { DataState, DataStore, localActionsFor, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { State as RootState } from '@/store/index'
import { Module } from "vuex";
import _ from "lodash";
import { IConnection } from "@/common/interfaces/IConnection";
import { safely } from "@/store/modules/data/StoreHelpers";


interface State extends DataState<SavedConnection> {

}


export const LocalConnectionModule: DataStore<SavedConnection, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null
  },
  mutations: mutationsFor<SavedConnection>({

  }),
  actions: localActionsFor<SavedConnection>(SavedConnection, {})

}