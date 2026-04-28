import { Module } from "vuex";
import Vue from "vue";
import { State as RootState } from "../../index";
import {
  AiServerGrants,
  AiServerLogEntry,
  AiServerStatusWithToken,
  EMPTY_GRANTS,
} from "@/common/interfaces/IAiServer";

interface State {
  status: AiServerStatusWithToken;
  grants: AiServerGrants;
  log: AiServerLogEntry[];
  loaded: boolean;
}

const initialStatus = (): AiServerStatusWithToken => ({
  running: false,
  configDisabled: true,
  host: "127.0.0.1",
  port: 21737,
  startedAt: null,
  pid: null,
  token: null,
});

const initialGrants = (): AiServerGrants => ({ ...EMPTY_GRANTS, connections: [], queries: [], workspaceIds: [] });

export const AiServerStoreModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    status: initialStatus(),
    grants: initialGrants(),
    log: [],
    loaded: false,
  }),
  getters: {
    serverUrl(state): string {
      return `http://${state.status.host}:${state.status.port}`;
    },
    enabled(state): boolean {
      return !state.status.configDisabled;
    },
  },
  mutations: {
    setStatus(state, status: AiServerStatusWithToken) {
      state.status = status;
    },
    setGrants(state, grants: AiServerGrants) {
      state.grants = grants;
    },
    setLog(state, log: AiServerLogEntry[]) {
      state.log = log.slice(-500);
    },
    appendLog(state, entry: AiServerLogEntry) {
      state.log.push(entry);
      if (state.log.length > 500) state.log.shift();
    },
    clearLog(state) {
      state.log = [];
    },
    markLoaded(state) {
      state.loaded = true;
    },
  },
  actions: {
    async refreshStatus(context) {
      const status = await Vue.prototype.$util.send("ai-server/status");
      context.commit("setStatus", status);
    },
    async start(context) {
      const status = await Vue.prototype.$util.send("ai-server/start");
      context.commit("setStatus", status);
    },
    async stop(context) {
      const status = await Vue.prototype.$util.send("ai-server/stop");
      context.commit("setStatus", status);
    },
    async regenerateToken(context) {
      const status = await Vue.prototype.$util.send("ai-server/regenerateToken");
      context.commit("setStatus", status);
    },
    async loadGrants(context) {
      const grants = await Vue.prototype.$util.send("ai-server/grants/get");
      context.commit("setGrants", grants);
    },
    async saveGrants(context, grants: AiServerGrants) {
      const saved = await Vue.prototype.$util.send("ai-server/grants/set", { grants });
      context.commit("setGrants", saved);
    },
    async loadLog(context, payload: { limit?: number; since?: number } = {}) {
      const entries = await Vue.prototype.$util.send("ai-server/log/list", payload);
      context.commit("setLog", entries ?? []);
    },
    async clearLog(context) {
      await Vue.prototype.$util.send("ai-server/log/clear");
      context.commit("clearLog");
    },
    async initialize(context) {
      if (context.state.loaded) return;
      await Promise.all([context.dispatch("refreshStatus"), context.dispatch("loadGrants"), context.dispatch("loadLog")]);
      context.commit("markLoaded");
    },
    receiveStatusPush(context, status: AiServerStatusWithToken) {
      context.commit("setStatus", status);
    },
    receiveLogPush(context, entry: AiServerLogEntry) {
      context.commit("appendLog", entry);
    },
  },
};
