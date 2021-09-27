import { DataModuleState, StateAndMutations } from "./BaseDataModule";

import { State as RootState } from '../../index'
import { Module } from "vuex";
import { CloudClient, CloudClientOptions } from "@/lib/cloud/CloudClient";


function url(url, ...parts: UrlPart[]) {
  return `${url}${parts.map((p) => p.toString().toLowerCase()).join('/')}`
}


interface State extends DataModuleState {
  client: CloudClient | null
}

export const CloudDataModule: Module<State, RootState> = {
  namespaced: true,
  state: {
    ...StateAndMutations.state,
    client: null,
  },
  mutations: {
    ...StateAndMutations.mutations,
    client(state, client: CloudClient) {
      state.client = client
    }
  },
  actions: {
    async initialize(context, options: CloudClientOptions) {
      const client = new CloudClient(options)
      context.commit('client', client)
    },
    async load(context) {
      const client = context.state.client
      if (!client) return
      const queries = await client.queriesList()
      context.commit('queriesReplace', queries)
    }
  }
}