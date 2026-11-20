import { PluginManager } from "@/services/plugin";
import { ThemeManager } from "@/services/theme/ThemeManager";
import { CliServer } from "@/services/cliServer/CliServer";
import { UtilityApi } from "@/services/UtilityApi";

class Context {
  utilityApi: UtilityApi;
  pluginManager: PluginManager;
  themeManager: ThemeManager;
  cliServer: CliServer;
}

/** State shared across all renderer sessions in the utility process */
export const context = new Context();
