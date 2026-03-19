import { TransportSshJumpHost } from "@/common/transport/TransportSshJumpHost";
import { DataState, DataStore, mutationsFor, utilActionsFor } from "@/store/modules/data/DataModuleBase";
import Vue from "vue";

type State = DataState<TransportSshJumpHost>

export const UtilJumpHostModule: DataStore<TransportSshJumpHost, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<TransportSshJumpHost>(),
  actions: utilActionsFor<TransportSshJumpHost>('jumpHost', {
    /**
     * Replace all jump hosts for a given connection with the provided list.
     * Finds existing rows directly from the db, removes them, then saves the new set.
     */
    async syncForConnection(context, { connectionId, jumpHosts }: { connectionId: number, jumpHosts: TransportSshJumpHost[] }) {
      const existing = await Vue.prototype.$util.send('appdb/jumpHost/find', {
        options: { where: { connectionId } }
      });
      if (existing.length > 0) {
        await Vue.prototype.$util.send('appdb/jumpHost/remove', { obj: existing });
      }
      const ordered = jumpHosts.map((jh, i) => ({ ...jh, connectionId, position: i }));
      if (ordered.length > 0) {
        await Vue.prototype.$util.send('appdb/jumpHost/save', { obj: ordered });
      }
      context.commit('remove', existing);
      if (ordered.length > 0) {
        context.commit('upsert', ordered);
      }
      return ordered;
    }
  }),
}
