import { IMembership } from "@/common/interfaces/IMembership";
import {
  actionsFor,
  DataState,
  DataStore,
  mutationsFor,
} from "@/store/modules/data/DataModuleBase";

type State = DataState<IMembership>;

export const CloudMembershipModule: DataStore<IMembership, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<IMembership>(),
  actions: actionsFor<IMembership>("memberships", {
    async initialize() {
      // noop
    },
    async poll() {
      // noop
    },
  }),
};
