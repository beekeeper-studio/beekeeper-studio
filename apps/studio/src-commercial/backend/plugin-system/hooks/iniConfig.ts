import { PluginManager } from "@/services/plugin";
import rawLog from "@bksLogger";
import _ from "lodash";

const log = rawLog.scope("plugin-system-hook:iniConfig");
const boundSymbol = Symbol("iniConfig");

export default async function bindIniConfig(manager: PluginManager, config: IBksConfig) {
  if (manager[boundSymbol]) {
    log.warn("already bound!");
    return;
  }

  manager[boundSymbol] = true;

  manager.addPluginSnaphostTransformer((snapshot) => {
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
