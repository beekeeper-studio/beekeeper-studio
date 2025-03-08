import { Manifest, PluginManager, PluginRegistryEntry } from "@/lib/plugins";

interface IPluginHandlers {
  "plugin/entries": (args: { filter?: "installed" | "all" }) => Promise<PluginRegistryEntry[]>
  "plugin/getInstalledPlugins": () => Promise<Manifest[]>
}

export const PluginHandlers: (pluginManager: PluginManager) => IPluginHandlers = (pluginManager) => ({
  "plugin/entries": async ({ filter }) => {
    return await pluginManager.getEntries(filter);
  },
  "plugin/getInstalledPlugins": async () => {
    return await pluginManager.getInstalledPlugins();
  },
});
