import { PluginManager } from "@/services/plugin";
import { ThemeManager } from "@/services/theme/ThemeManager";
import { CliServer } from "@/services/cliServer/server";

class Context {
  pluginManager: PluginManager;
  themeManager: ThemeManager;
  cliServer: CliServer;
}

/** State shared across all renderer sessions in the utility process */
export const context = new Context();
