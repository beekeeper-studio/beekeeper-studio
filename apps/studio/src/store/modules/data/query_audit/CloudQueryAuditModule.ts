import { Module } from "vuex";
import { havingCli } from "../StoreHelpers";
import { State as RootState } from "../../../index";
import { IQueryAudit, IQueryAuditDetail } from "@/common/interfaces/IQueryAudit";
import ISavedQuery from "@/common/interfaces/ISavedQuery";

// Query audits are fetched on demand for a single query, not synced as a
// global collection, so this module has no items/load/poll behaviour.
interface State {
  pollError: null;
}

export const CloudQueryAuditModule: Module<State, RootState> = {
  namespaced: true,
  state: {
    pollError: null,
  },
  actions: {
    async load() {},
    async poll() {},
    async list(context, queryId: number): Promise<IQueryAudit[]> {
      return await havingCli(
        context,
        (cli) => cli.queryAudits.list(queryId),
      );
    },
    async get(
      context,
      { queryId, auditId }: { queryId: number; auditId: number }
    ): Promise<IQueryAuditDetail> {
      return await havingCli(
        context,
        (cli) => cli.queryAudits.get(queryId, auditId),
      );
    },
    async restore(
      context,
      { queryId, auditId }: { queryId: number; auditId: number }
    ): Promise<void> {
      return await havingCli(
        context,
        (cli) => cli.queryAudits.restore(queryId, auditId),
      );
    },
  },
};
