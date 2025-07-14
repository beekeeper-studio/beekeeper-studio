import { EncryptedPluginData } from "@/common/appdb/models/EncryptedPluginData";
import { PluginData } from "@/common/appdb/models/PluginData";
import { Manifest, PluginManager, PluginRegistryEntry, PluginRepository } from "@/services/plugin";

interface IPluginHandlers {
  "plugin/enabledPlugins": () => Promise<Manifest[]>
  "plugin/entries": () => Promise<PluginRegistryEntry[]>
  "plugin/repository": ({ id }: { id: string }) => Promise<PluginRepository>
  "plugin/install": ({ id }: { id: string }) => Promise<Manifest>
  "plugin/update": ({ id }: { id: string }) => Promise<Manifest>
  "plugin/uninstall": ({ id }: { id: string }) => Promise<void>
  "plugin/checkForUpdates": ({ id }: { id: string }) => Promise<boolean>
  "plugin/setAutoUpdateEnabled": ({ id, enabled }: { id: string, enabled: boolean }) => Promise<void>
  "plugin/getAutoUpdateEnabled": ({ id }: { id: string }) => Promise<boolean>

  "plugin/getData": ({ manifest, key }: { manifest: Manifest, key?: string }) => Promise<unknown>
  "plugin/setData": ({ manifest, key }: { manifest: Manifest, key?: string, value?: unknown }) => Promise<void>
  "plugin/getEncryptedData": ({ manifest, key }: { manifest: Manifest, key?: string }) => Promise<unknown>
  "plugin/setEncryptedData": ({ manifest, key }: { manifest: Manifest, key?: string, value?: unknown }) => Promise<void>
  "plugin/getAsset": ({ manifest, path }: { manifest: Manifest, path: string }) => Promise<string>
}

export const PluginHandlers: (pluginManager: PluginManager) => IPluginHandlers = (pluginManager) => ({
  "plugin/enabledPlugins": async () => {
    return await pluginManager.getEnabledPlugins();
  },
  "plugin/entries": async () => {
    return await pluginManager.getEntries();
  },
  "plugin/repository": async ({ id }) => {
    return await pluginManager.getRepository(id);
  },
  "plugin/install": async ({ id }) => {
    return await pluginManager.installPlugin(id);
  },
  "plugin/update": async ({ id }) => {
    return await pluginManager.updatePlugin(id);
  },
  "plugin/uninstall": async ({ id }) => {
    return await pluginManager.uninstallPlugin(id);
  },
  "plugin/checkForUpdates": async ({ id }) => {
    return await pluginManager.checkForUpdates(id);
  },
  "plugin/setAutoUpdateEnabled": async ({ id, enabled }) => {
    await pluginManager.setPluginAutoUpdateEnabled(id, enabled);
  },
  "plugin/getAutoUpdateEnabled": async ({ id }) => {
    return pluginManager.getPluginAutoUpdateEnabled(id);
  },

  "plugin/setData": async ({ manifest, key, value }) => {
    await PluginData.set(manifest.id, key, value);
  },
  "plugin/getData": async ({ manifest, key }) => {
    return await PluginData.get(manifest.id, key);
  },
  "plugin/setEncryptedData": async ({ manifest, key, value }) => {
    await EncryptedPluginData.set(manifest.id, key, value);
  },
  "plugin/getEncryptedData": async ({ manifest, key }) => {
    return await EncryptedPluginData.get(manifest.id, key);
  },
  "plugin/getAsset": async ({ manifest, path }) => {
    return await pluginManager.getPluginAsset(manifest, path);
  }
});
