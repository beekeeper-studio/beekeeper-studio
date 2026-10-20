import { EncryptedPluginData } from "@/common/appdb/models/EncryptedPluginData";
import { PluginData, PluginDataOptions } from "@/common/appdb/models/PluginData";
import { Manifest, PluginSnapshot, PluginManager, PluginRegistryEntry, PluginRepository } from "@/services/plugin";
import { PluginSystemError } from "@/lib/errors";
import { state } from "@/handlers/handlerState";

type PluginDataScopeName = "currentConnection" | "currentWorkspace";

interface IPluginHandlers {
  "plugin/plugins": () => Promise<PluginSnapshot[]>
  "plugin/entries": ({ clearCache }: { clearCache: boolean }) => Promise<{ official: PluginRegistryEntry[], community: PluginRegistryEntry[] }>
  "plugin/repository": ({ id }: { id: string }) => Promise<PluginRepository>
  "plugin/install": ({ id }: { id: string }) => Promise<Manifest>
  "plugin/update": ({ id }: { id: string }) => Promise<Manifest>
  "plugin/uninstall": ({ id }: { id: string }) => Promise<void>
  "plugin/checkForUpdates": ({ id }: { id: string }) => Promise<boolean>
  "plugin/setAutoUpdateEnabled": ({ id, enabled }: { id: string, enabled: boolean }) => Promise<void>
  "plugin/getAutoUpdateEnabled": ({ id }: { id: string }) => Promise<boolean>
  "plugin/viewEntrypointExists": ({ pluginId, viewId }: { pluginId: string, viewId: string }) => Promise<boolean>

  "plugin/getData": ({ manifest, key, scope, sId }: { manifest: Manifest, key?: string, scope?: PluginDataScopeName, sId: string }) => Promise<unknown>
  "plugin/setData": ({ manifest, key, value, scope, sId }: { manifest: Manifest, key?: string, value?: unknown, scope?: PluginDataScopeName, sId: string }) => Promise<void>
  "plugin/getEncryptedData": ({ manifest, key, scope, sId }: { manifest: Manifest, key?: string, scope?: PluginDataScopeName, sId: string }) => Promise<unknown>
  "plugin/setEncryptedData": ({ manifest, key, value, scope, sId }: { manifest: Manifest, key?: string, value?: unknown, scope?: PluginDataScopeName, sId: string }) => Promise<void>
  "plugin/getAsset": ({ manifest, path }: { manifest: Manifest, path: string }) => Promise<string>
}

function resolveScope(sId: string, scope: PluginDataScopeName) {
  if (scope === "currentConnection") {
    const config = state(sId).usedConfig;
    if (!config) {
      throw new Error(`Plugin data scope "${scope}" requires an active connection.`);
    }
    return { connectionId: config.id, workspaceId: config.workspaceId };
  }

  if (scope === "currentWorkspace") {
    const config = state(sId).usedConfig;
    if (!config) {
      throw new Error(`Plugin data scope "${scope}" requires an active connection.`);
    }
    return { connectionId: null, workspaceId: config.workspaceId };
  }

  throw new Error(`Unknown plugin data scope: ${scope}`);
}

export const PluginHandlers: (pluginManager: PluginManager) => IPluginHandlers = (pluginManager) => ({
  "plugin/waitForInit": async () => {
    if (pluginManager.isInitialized) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      let duration = 0;
      const interval = setInterval(() => {
        duration += 100;
        if (pluginManager.isInitialized) {
          clearInterval(interval);
          resolve();
        } else if (duration > 30_000) {
          clearInterval(interval);
          reject(
            new PluginSystemError(
              "INIT_TIMEOUT",
              "Plugin initialization timed out"
            )
          );
        }
      }, 100);
    });
  },
  "plugin/plugins": async () => {
    return await pluginManager.getPlugins();
  },
  "plugin/entries": async ({ clearCache }) => {
    if (clearCache) {
      pluginManager.registry.clearCache();
    }
    return await pluginManager.registry.getEntries();
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
  "plugin/viewEntrypointExists": async ({ pluginId, viewId }) => {
    return pluginManager.viewEntrypointExists(pluginId, viewId);
  },

  "plugin/setData": async ({ sId, manifest, key, value, scope }) => {
    const options: PluginDataOptions = {
      ...(scope ? resolveScope(sId, scope) : {}),
    };
    await PluginData.set(manifest.id, key, value, options);
  },
  "plugin/getData": async ({ sId, manifest, key, scope }) => {
    const options: PluginDataOptions = {
      ...(scope ? resolveScope(sId, scope) : {}),
    };
    return await PluginData.get(manifest.id, key, options);
  },
  "plugin/setEncryptedData": async ({ sId, manifest, key, value, scope }) => {
    const options: PluginDataOptions = {
      ...(scope ? resolveScope(sId, scope) : {}),
    };
    await EncryptedPluginData.set(manifest.id, key, value, options);
  },
  "plugin/getEncryptedData": async ({ sId, manifest, key, scope }) => {
    const options: PluginDataOptions = {
      ...(scope ? resolveScope(sId, scope) : {}),
    };
    return await EncryptedPluginData.get(manifest.id, key, options);
  },
  "plugin/getAsset": async ({ manifest, path }) => {
    return await pluginManager.getPluginAsset(manifest, path);
  }
});
