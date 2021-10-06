import { DataState, mutationsFor } from "../DataModuleBase";

import { State as RootState } from '@/store/index'
import { Module } from "vuex";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { safelyDo, havingCli } from "../StoreHelpers";


interface State extends DataState<ISavedQuery> {
}

export const CloudQueryModule: Module<State, RootState> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null
  },
  mutations: mutationsFor<ISavedQuery>({
    // more mutations go here
  }),
  actions: {
    async load(context) {
      await safelyDo(context, async (cli) => {
        const queries = await cli.queries.list()
        context.commit('upsert', queries)
      })
    },
    async save(context, query: ISavedQuery) {
      return await havingCli(context, async (cli) => {
        const updated = await cli.queries.upsert(query)
        context.commit('upsert', updated)
        return updated
      })
    },
    async remove(context, query: ISavedQuery) {
      await havingCli(context, async (cli) => {
        await cli.queries.delete(query)
        context.commit('remove', query)
      })
    },
    async reload(context, id: number) {
      return await havingCli(context, async (cli) => {
        const updated = await cli.queries.get(id)
        context.commit('upsert', updated)
        return updated
      })
    }
  }
}