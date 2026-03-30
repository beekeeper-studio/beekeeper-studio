import { TransportConnectionSshConfig } from "@/common/transport/TransportSshConfig";
import {
  DataState,
  DataStore,
  mutationsFor,
  utilActionsFor,
} from "@/store/modules/data/DataModuleBase";

type State = DataState<TransportConnectionSshConfig>;

export const UtilSshConfigModule: DataStore<
  TransportConnectionSshConfig,
  State
> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<TransportConnectionSshConfig>(),
  actions: utilActionsFor<TransportConnectionSshConfig>("connectionSshConfig"),
};
