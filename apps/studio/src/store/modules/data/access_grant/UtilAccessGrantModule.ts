import _ from "lodash";
import { IAccessGrant } from "@/common/interfaces/IAccessGrant";
import {
  DataState,
  DataStore,
  mutationsFor,
} from "@/store/modules/data/DataModuleBase";

type State = DataState<IAccessGrant>;

const localOnly = () => {
  throw new Error("Access grants are only available in cloud workspaces");
};

export const UtilAccessGrantModule: DataStore<IAccessGrant, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<IAccessGrant>({}, { field: "id", direction: "asc" }),
  actions: {
    async initialize() {
      // noop
    },
    async load() {
      // no-op: access grants are cloud-only
    },
    async poll() {
      // no-op: access grants are cloud-only
    },
    async clearError(context) {
      context.commit("error", null);
    },
    async save() {
      return localOnly();
    },
    async remove() {
      return localOnly();
    },
    async reload() {
      return null;
    },
    async clone(_context, item: IAccessGrant) {
      const result = _.cloneDeep(item);
      result.id = null;
      return result;
    },
  },
};
