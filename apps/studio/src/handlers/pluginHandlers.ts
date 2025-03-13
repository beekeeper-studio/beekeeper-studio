import { Manifest, PluginManager, PluginRegistryEntry } from "@/services/plugin";

interface IPluginHandlers {
  "plugin/enabledPlugins": () => Promise<Manifest[]>
  "plugin/entries": () => Promise<PluginRegistryEntry[]>
  "plugin/install": ({ entry }: { entry: PluginRegistryEntry }) => Promise<Manifest>
  "plugin/uninstall": ({ manifest }: { manifest: Manifest }) => Promise<void>

  "plugin/getAsset": ({ manifest, path }: { manifest: Manifest, path: string }) => Promise<string>
}

export const PluginHandlers: (pluginManager: PluginManager) => IPluginHandlers = (pluginManager) => ({
  "plugin/enabledPlugins": async () => {
    return await pluginManager.getEnabledPlugins();
  },
  "plugin/entries": async () => {
    return await pluginManager.getEntries();
  },
  "plugin/install": async ({ entry }) => {
    return await pluginManager.installPlugin(entry);
  },
  "plugin/uninstall": async ({ manifest }) => {
    return await pluginManager.uninstallPlugin(manifest);
  },

  "plugin/getAsset": async ({ manifest, path }) => {
    return await pluginManager.getPluginAsset(manifest, path);
  }
});
