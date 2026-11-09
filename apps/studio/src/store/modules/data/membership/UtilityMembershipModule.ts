import _ from "lodash";
import { IMembership } from "@/common/interfaces/IMembership";
import {
  DataState,
  DataStore,
  mutationsFor,
} from "@/store/modules/data/DataModuleBase";

type State = DataState<IMembership>;

const localOnly = () => {
  throw new Error("Memberships are only available in cloud workspaces");
};

export const UtilMembershipModule: DataStore<IMembership, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<IMembership>({}, { field: "name", direction: "asc" }),
  actions: {
    async initialize() {
      // noop
    },
    async load() {
      // no-op: memberships are cloud-only
    },
    async poll() {
      // no-op: memberships are cloud-only
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
    async clone(_context, item: IMembership) {
      return _.cloneDeep(item);
    },
  },
};
