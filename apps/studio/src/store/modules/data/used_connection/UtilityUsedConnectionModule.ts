import { IConnection } from "@/common/interfaces/IConnection";
import { DataState, DataStore, mutationsFor, utilActionsFor } from "@/store/modules/data/DataModuleBase";
import _ from "lodash";
import { safely } from "../StoreHelpers";
import Vue from "vue";

// A connection with nothing saved behind it gets a fresh row on every connect,
// so the rows pile up. Nothing is deleted - the recent list just shows the
// most recent handful.
const RECENT_LIMIT = 10;

type State = DataState<IConnection>;

// Rows are written by the backend (UsedConnection.recordUse, from conn/create)
// once a connection is actually up. This module only reads them.
// NOTE (@day): may need to add a custom action for removeUsedConfig that also deletes the tokencache?
export const UtilUsedConnectionModule: DataStore<IConnection, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null
  },
  mutations: mutationsFor<IConnection>(),
  actions: utilActionsFor<IConnection>('used', {
    async load(context) {
      context.commit("error", null);
      await safely(context, async () => {
        const items = await Vue.prototype.$util.send(`appdb/used/find`, { options: { where: { workspaceId: context.rootState.workspaceId } } });
        context.commit('set', items);
      })
    }
  }),
  getters: {
    orderedUsedConfigs(state) {
      return _.sortBy(state.items, 'updatedAt').reverse().slice(0, RECENT_LIMIT)
    }
  }
}
