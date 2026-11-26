import { PluginManager } from "@/services/plugin";
import { ThemeManager } from "@/services/theme/ThemeManager";
import { SocketPortAdapter } from "@/services/cliServer/SocketPortAdapter";
import { UtilityApi } from "@/services/UtilityApi";

class Context {
  utilityApi: UtilityApi;
  pluginManager: PluginManager;
  themeManager: ThemeManager;
  cliSocket: SocketPortAdapter;
}

/** State shared across all renderer sessions in the utility process */
export const context = new Context();
