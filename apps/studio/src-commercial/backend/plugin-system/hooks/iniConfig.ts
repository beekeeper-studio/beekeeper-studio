/**
 * iniConfig Hook
 *
 * Binds a plugin snapshot transformer that disables plugins based on the
 * user's configuration file (beekeeper.ini).
 *
 * Example config:
 * [plugins.my-plugin-id]
 * disabled = true
 */
import { PluginManager } from "@/services/plugin";
import rawLog from "@bksLogger";
import _ from "lodash";

const log = rawLog.scope("plugin-system-hook:iniConfig");
const boundSymbol = Symbol("iniConfig");

export default function bindIniConfig(manager: PluginManager, config: IBksConfig) {
  if (manager[boundSymbol]) {
    log.warn("already bound!");
    return;
  }

  manager[boundSymbol] = true;

  manager.addPluginSnapshotTransformer((snapshot) => {
    const disabled = config.plugins?.[snapshot.manifest.id]?.disabled;

    if (_.isUndefined(disabled)) {
      return snapshot;
    }

    if (!disabled) {
      return snapshot;
    }

    const disableReasons = snapshot.disabled
      ? [...snapshot.disableReasons, { source: "config" }]
      : [{ source: "config" }];

    return { ...snapshot, disabled, disableReasons };
  });
}
