import { Manifest, PluginManager, PluginRegistryEntry } from "@/lib/plugins";

interface IPluginHandlers {
  "plugin/entries": ({ filter }: { filter?: "installed" | "all" }) => Promise<PluginRegistryEntry[]>
  "plugin/getActivePlugins": () => Promise<Manifest[]>
  "plugin/getAsset": ({ manifest, path }: { manifest: Manifest, path: string }) => Promise<string>
}

export const PluginHandlers: (pluginManager: PluginManager) => IPluginHandlers = (pluginManager) => ({
  "plugin/entries": async ({ filter }) => {
    return await pluginManager.getEntries(filter);
  },
  "plugin/getActivePlugins": async () => {
    return await pluginManager.getActivePlugins();
  },
  "plugin/getAsset": async ({ manifest, path }) => {
    return await pluginManager.getPluginAsset(manifest, path);
  }
});
