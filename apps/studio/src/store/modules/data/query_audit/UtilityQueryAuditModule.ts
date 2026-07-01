import Vue from "vue";
import { Module } from "vuex";
import { State as RootState } from "@/store";
import {
  TransportQueryAudit,
  TransportQueryAuditDetail,
} from "@/common/transport/TransportQueryAudit";

interface State {
  pollError: null;
}

export const UtilQueryAuditModule: Module<State, RootState> = {
  namespaced: true,
  state: {
    pollError: null,
  },
  actions: {
    async load() {},
    async poll() {},
    async list(_context, queryId: number): Promise<TransportQueryAudit[]> {
      return await Vue.prototype.$util.send("appdb/queryAudit/find", {
        options: { where: { favoriteQueryId: queryId } },
      });
    },
    async get(
      _context,
      { auditId }: { auditId: number }
    ): Promise<TransportQueryAuditDetail> {
      return await Vue.prototype.$util.send("appdb/queryAudit/get", { auditId });
    },
    async restore(
      _context,
      { auditId }: { auditId: number }
    ): Promise<void> {
      await Vue.prototype.$util.send("appdb/queryAudit/restore", { auditId });
    },
  },
};
