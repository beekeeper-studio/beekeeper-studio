import Vue from "vue";
import { Module } from "vuex";
import { State as RootState } from "../index";
import type { AuthorizedCliClient } from "@/handlers/cliServerHandlers";

interface State {
  clients: AuthorizedCliClient[];
}

export const CliModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    clients: [],
  }),
  getters: {
    authorized(state) {
      return state.clients.length > 0;
    },
  },
  mutations: {
    setClients(state, clients: AuthorizedCliClient[]) {
      state.clients = clients;
    },
  },
  actions: {
    async loadClients(context) {
      const clients: AuthorizedCliClient[] = await Vue.prototype.$util.send(
        "cliServer/authorizedClients"
      );
      context.commit("setClients", clients);
    },
  },
};
