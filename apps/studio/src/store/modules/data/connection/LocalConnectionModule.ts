import { SavedConnection } from "@/common/appdb/models/saved_connection";
import { DataState, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { State as RootState } from '@/store/index'
import { Module } from "vuex";
import _ from "lodash";
import { IConnection } from "@/common/interfaces/IConnection";
import { wait } from "@shared/lib/wait";
import { safely } from "@/store/modules/data/StoreHelpers";


interface State extends DataState<SavedConnection> {

}


export const LocalConnectionModule: Module<State, RootState> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null
  },
  mutations: mutationsFor<SavedConnection>({

  }),
  actions: {
    async load(context) {
      await safely(context, async () => {
        const configs = await SavedConnection.find()
        context.commit('upsert', configs)
      })
    },
    async clone(_context, config: IConnection) {
      const result = new SavedConnection()
      Object.assign(result, config)
      result.id = null
      return result
    }
  }

}