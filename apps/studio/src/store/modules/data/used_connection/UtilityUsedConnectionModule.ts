import { IConnection } from "@/common/interfaces/IConnection";
import { DataState, DataStore, mutationsFor, utilActionsFor } from "@/store/modules/data/DataModuleBase";
import _ from "lodash";
import rawLog from "@bksLogger";
import { safely } from "../StoreHelpers";
import Vue from "vue";

const log = rawLog.scope('data/usedconnections');

// Identity of a connection that has no saved_connection behind it: two
// configs pointing at the same server share one recent-connections entry.
const SERVER_FIELDS = [
  'connectionType', 'host', 'port', 'socketPath', 'socketPathEnabled',
  'username', 'domain', 'defaultDatabase', 'url', 'sshEnabled', 'sshHost',
  'sshPort', 'sshUsername',
]

function sameServer(a: any, b: any): boolean {
  return SERVER_FIELDS.every((f) => (a[f] ?? null) === (b[f] ?? null))
}

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
      // `config` is therefore only ever one of two things:
      // - a saved connection: `id` is a saved_connection id
      // - a brand new, unsaved connection: `id` is null
      //
      // The connection screen converts a recent-connections row into the
      // latter before connecting (ConnectionInterface.configFrom), so a
      // used_connection must never reach here.
      if (!_.isUndefined((config as { connectionId?: Nullable<number> }).connectionId)) {
        throw new Error("recordUsed was handed a used_connection. Connect with a saved connection, or a new unsaved one.")
      }

      const savedConnectionId = config.id ?? null

      const lastUsedConnection = context.state.items.find((c) => {
        if (c.workspaceId !== config.workspaceId) return false
        if (savedConnectionId && c.connectionId === savedConnectionId) return true
        // A connection with nothing saved behind it has no id to match on, so
        // match on where it points instead. That keeps repeat connects to the
        // same unsaved connection on one recent-list entry, and lets a
        // connection that has since been saved adopt the entry it grew out of
        // rather than leaving a duplicate behind.
        return _.isNil(c.connectionId) && sameServer(c, config)
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

      // `config` is returned untouched: its id is a saved_connection id, or
      // null for a connection that was never saved. A null id disables
      // per-connection persistence for the session (see the usedConfig.id
      // guards in TabModule and friends) instead of borrowing some other
      // saved connection's key.
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
