import { QueryModuleState, StateAndMutations } from "./BaseQueryModule";

import { State as RootState } from '../../../index'
import { Module } from "vuex";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { ClientError, safelyDo } from "../StoreHelpers";


interface State extends QueryModuleState {
  loading: boolean
  error: ClientError
}

export const CloudQueryModule: Module<State, RootState> = {
  namespaced: true,
  state: {
    ...StateAndMutations.state,
    loading: false,
    error: null
  },
  mutations: {
    ...StateAndMutations.mutations,
  },
  actions: {
    async load(context) {
      safelyDo(context, async (cli) => {
        const queries = await cli.queries.list()
        context.commit('replace', queries)
      })
    },
    async save(context, query: ISavedQuery) {
      safelyDo(context, async (cli) => {
        const updated = await cli.queries.upsert(query)
        context.commit('add', updated)
      })
    },
    async remove(context, query: ISavedQuery) {
      safelyDo(context, async (cli) => {
        await cli.queries.delete(query)
        context.commit('remove', query)
      })
    }
  }
}