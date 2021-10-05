import { QueryModuleState, StateAndMutations } from "./BaseQueryModule";

import { State as RootState } from '../../../index'
import { Module } from "vuex";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { safelyDo, havingCli } from "../StoreHelpers";


interface State extends QueryModuleState {
}

export const CloudQueryModule: Module<State, RootState> = {
  namespaced: true,
  state: {
    ...StateAndMutations.state,
  },
  mutations: {
    ...StateAndMutations.mutations,
  },
  actions: {
    async load(context) {
      console.log("init load queries")
      await safelyDo(context, async (cli) => {
        console.log("getting queries")
        const queries = await cli.queries.list()
        console.log("queries", queries)
        context.commit('replace', queries)
      })
    },
    async save(context, query: ISavedQuery) {
      return await havingCli(context, async (cli) => {
        console.log("saving", query)
        const updated = await cli.queries.upsert(query)
        context.commit('add', updated)
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