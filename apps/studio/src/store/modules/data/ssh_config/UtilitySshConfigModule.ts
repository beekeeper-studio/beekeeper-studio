import { TransportSshConfig } from "@/common/transport/TransportSshConfig";
import { DataState, DataStore, mutationsFor, utilActionsFor } from "@/store/modules/data/DataModuleBase";
import Vue from "vue";

type State = DataState<TransportSshConfig>

export const UtilSshConfigModule: DataStore<TransportSshConfig, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<TransportSshConfig>(),
  actions: utilActionsFor<TransportSshConfig>('sshConfig', {
    /**
     * Replace all SSH configs for a given connection with the provided list.
     * Finds existing rows directly from the db, removes them, then saves the new set.
     */
    async syncForConnection(context, { connectionId, sshConfigs }: { connectionId: number, sshConfigs: TransportSshConfig[] }) {
      const existing = await Vue.prototype.$util.send('appdb/sshConfig/find', {
        options: { where: { connectionId } }
      });
      if (existing.length > 0) {
        await Vue.prototype.$util.send('appdb/sshConfig/remove', { obj: existing });
      }
      const ordered = sshConfigs.map((cfg, i) => ({ ...cfg, connectionId, position: i }));
      if (ordered.length > 0) {
        await Vue.prototype.$util.send('appdb/sshConfig/save', { obj: ordered });
      }
      context.commit('remove', existing);
      if (ordered.length > 0) {
        context.commit('upsert', ordered);
      }
      return ordered;
    }
  }),
}
