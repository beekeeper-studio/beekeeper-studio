import { PluginManager } from "@/services/plugin";
import { ThemeManager } from "@/services/theme/ThemeManager";

class Context {
  pluginManager: PluginManager;
  themeManager: ThemeManager;
}

/** State shared across all renderer sessions in the utility process */
export const context = new Context();
