import { IConnection } from "@/common/interfaces/IConnection";
import { DataState, DataStore, mutationsFor, utilActionsFor } from "@/store/modules/data/DataModuleBase";
import _ from "lodash";
import rawLog from "@bksLogger";
import { safely } from "../StoreHelpers";
import Vue from "vue";

const log = rawLog.scope('data/usedconnections');

type State = DataState<IConnection>;

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
    async recordUsed(context, config: IConnection) {
      log.debug("Recording used config for: ", config)
      // Everything persisted per-connection (open tabs, pins, hidden
      // entities, tab history) is keyed on the id this action returns, and
      // that key lives in the saved_connection id space. used_connection has
      // its own independent id sequence, so a used_connection id must never
      // escape this action as a config id - it collides with unrelated saved
      // connections (the "phantom tabs" bug).
      //
      // `config` comes in three shapes:
      // - a saved connection: `id` is a saved_connection id, no
      //   `connectionId` property
      // - a brand new, unsaved connection from the connection form: `id` is
      //   null
      // - a used_connection row, passed directly by the recent-connections
      //   list when the connection it came from was never saved (or no
      //   longer exists): `id` is a used_connection id, and `connectionId`
      //   holds the saved_connection reference or null
      const isUsedConfig = !_.isUndefined((config as any).connectionId)
      const savedConnectionId = isUsedConfig ? (config as any).connectionId : config.id

      const lastUsedConnection = context.state.items.find(c => {
        if (isUsedConfig) {
          return c.id === config.id
        }
        return savedConnectionId &&
          config.workspaceId &&
          c.connectionId === savedConnectionId &&
          c.workspaceId === config.workspaceId;
      });
      log.debug("Found used config", lastUsedConnection);
      if (lastUsedConnection) {
        // Overlay the latest connection details from `config` onto the
        // existing used_connection row, so subsequent reads reflect the
        // current host/port/credentials/etc., not the snapshot from the
        // first connect.
        await context.dispatch('save', {
          ...config,
          id: lastUsedConnection.id,
          connectionId: savedConnectionId,
          workspaceId: config.workspaceId,
          createdAt: lastUsedConnection.createdAt,
          updatedAt: new Date(),
        });
      } else {
        await context.dispatch('save', {
          ...config,
          id: null,
          connectionId: savedConnectionId,
        });
      }

      // Return a config keyed on the saved_connection id. For a connection
      // that was never saved that key is null, which disables per-connection
      // persistence for the session (see the usedConfig.id guards in
      // TabModule and friends) instead of reading/writing some other saved
      // connection's data.
      if (isUsedConfig) {
        return { ..._.omit(config, 'connectionId'), id: savedConnectionId ?? null } as IConnection
      }
      return config;
    },
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
      return _.sortBy(state.items, 'updatedAt').reverse()
    }
  }
}
