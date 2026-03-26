import { TransportSshConfig, TransportConnectionSshConfig } from "@/common/transport/TransportSshConfig";
import { DataState, DataStore, mutationsFor, utilActionsFor } from "@/store/modules/data/DataModuleBase";
import Vue from "vue";

type State = DataState<TransportConnectionSshConfig>

export const UtilSshConfigModule: DataStore<TransportConnectionSshConfig, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<TransportConnectionSshConfig>(),
  actions: utilActionsFor<TransportConnectionSshConfig>('connectionSshConfig', {
    /**
     * Replace all SSH configs for a given connection with the provided ordered list.
     *
     * For each new ssh config:
     *   1. Save it as a standalone ssh_config row (get an id back)
     *   2. Create a connection_ssh_config join row linking it to the connection with a position
     *
     * Then remove the old join rows and any ssh_config rows that are now orphaned.
     */
    async syncForConnection(context, { connectionId, sshConfigs }: { connectionId: number, sshConfigs: TransportSshConfig[] }) {
      // Find existing join rows for this connection
      const existingJoins: TransportConnectionSshConfig[] = await Vue.prototype.$util.send('appdb/connectionSshConfig/find', {
        options: { where: { connectionId } }
      });

      // Save new ssh_config rows and create join rows
      const newJoins: TransportConnectionSshConfig[] = [];
      for (let i = 0; i < sshConfigs.length; i++) {
        const cfg = sshConfigs[i];
        // Save (or update if it has an id) the standalone ssh_config row
        const savedConfig: TransportSshConfig = await Vue.prototype.$util.send('appdb/sshConfig/save', { obj: cfg });
        // Create the join row
        const join: TransportConnectionSshConfig = await Vue.prototype.$util.send('appdb/connectionSshConfig/save', {
          obj: {
            id: null,
            connectionId,
            sshConfigId: savedConfig.id,
            position: i,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: null,
          }
        });
        join.sshConfig = savedConfig;
        newJoins.push(join);
      }

      // Remove old join rows
      if (existingJoins.length > 0) {
        const orphanedSshConfigIds = existingJoins.map((j) => j.sshConfigId);
        await Vue.prototype.$util.send('appdb/connectionSshConfig/remove', { obj: existingJoins });

        // Delete ssh_config rows that are now orphaned (not referenced by any other connection)
        for (const sshConfigId of orphanedSshConfigIds) {
          const remaining = await Vue.prototype.$util.send('appdb/connectionSshConfig/count', {
            options: { where: { sshConfigId } }
          });
          if (remaining === 0) {
            await Vue.prototype.$util.send('appdb/sshConfig/remove', { obj: { id: sshConfigId } });
          }
        }
      }

      context.commit('remove', existingJoins);
      context.commit('upsert', newJoins);
      return newJoins;
    }
  }),
}
