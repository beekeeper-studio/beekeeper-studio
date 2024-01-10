import { ConnectionFolder } from "@/common/appdb/models/ConnectionFolder";
import {
  DataState,
  DataStore,
  localActionsFor,
  mutationsFor,
} from "@/store/modules/data/DataModuleBase";

export const LocalConnectionFolderModule: DataStore<
  ConnectionFolder,
  DataState<ConnectionFolder>
> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<ConnectionFolder>({}),
  actions: localActionsFor<ConnectionFolder>(
    ConnectionFolder,
    {},
    { take: 100, order: { createdAt: "DESC" } }
  ),
};
