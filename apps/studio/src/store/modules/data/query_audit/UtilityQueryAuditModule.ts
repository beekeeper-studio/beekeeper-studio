import Vue from "vue";
import { Module } from "vuex";
import { State as RootState } from "../../../index";
import { IQueryAudit, IQueryAuditDetail } from "@/common/interfaces/IQueryAudit";
import { TransportFavoriteQuery } from "@/common/transport";

// Local counterpart to CloudQueryAuditModule. Talks to the utility process
// appdb handlers so edit history works offline. Audits are fetched on demand
// per query, so there is no items/load/poll behaviour.
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
    async list(_context, queryId: number): Promise<IQueryAudit[]> {
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
    ): Promise<IQueryAuditDetail> {
      return await Vue.prototype.$util.send("appdb/queryAudit/get", {
        queryId,
        auditId,
      });
    },
    async restore(
      _context,
      { queryId, auditId }: { queryId: number; auditId: number }
    ): Promise<TransportFavoriteQuery> {
      return await Vue.prototype.$util.send("appdb/queryAudit/restore", {
        queryId,
        auditId,
      });
    },
  },
};
