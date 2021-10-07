import { ICloudSavedConnection, IConnection } from "@/common/interfaces/IConnection";
import { DataState, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { Module } from "vuex";
import { State as RootState } from '@/store/index'
import { safelyDo } from '../StoreHelpers'
import _ from "lodash";
import { wait } from "@shared/lib/wait";

interface State extends DataState<ICloudSavedConnection> {

}


export const CloudConnectionModule: Module<State, RootState> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null
  },
  mutations: mutationsFor<ICloudSavedConnection>({

  }),
  actions: {
    async load(context) {
      console.log('loading connections')
      await safelyDo(context, async (cli) => {
        console.log("listing connections")
        const connections = await cli.connections.list()
        console.log("connections", connections)
        context.commit('upsert', connections)
      })
    },
    async clone(_context, config: IConnection) {
      const result = _.clone(config)
      result.id = null
      return result
    }
  }
}