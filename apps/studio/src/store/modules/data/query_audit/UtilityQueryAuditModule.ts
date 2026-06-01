import { Module } from "vuex";
import { State as RootState } from "../../../index";
import { IQueryAudit, IQueryAuditDetail } from "@/common/interfaces/IQueryAudit";
import ISavedQuery from "@/common/interfaces/ISavedQuery";

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
    async list(): Promise<IQueryAudit[]> {
      return [];
    },
    async get(): Promise<IQueryAuditDetail | null> {
      return null;
    },
    async restore(): Promise<ISavedQuery | null> {
      return null;
    },
  },
};
