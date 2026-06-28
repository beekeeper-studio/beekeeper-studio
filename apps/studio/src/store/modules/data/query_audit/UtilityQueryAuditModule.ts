import Vue from "vue";
import { Module } from "vuex";
import { State as RootState } from "@/store";
import {
  TransportQueryAudit,
  TransportQueryAuditDetail,
} from "@/common/transport/TransportQueryAudit";
import { TransportFavoriteQuery } from "@/common/transport";

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
        options: {
          where: { favoriteQueryId: queryId },
          order: { revision: "DESC" },
        },
      });
    },
    async get(
      _context,
      { queryId, auditId }: { queryId: number; auditId: number }
    ): Promise<TransportQueryAuditDetail> {
      return await Vue.prototype.$util.send("appdb/queryAudit/get", {
        queryId,
        auditId,
      });
    },
    async restore(
      _context,
      { queryId, auditId }: { queryId: number; auditId: number }
    ): Promise<void> {
      await Vue.prototype.$util.send("appdb/queryAudit/restore", {
        queryId,
        auditId,
      });
    },
  },
};
