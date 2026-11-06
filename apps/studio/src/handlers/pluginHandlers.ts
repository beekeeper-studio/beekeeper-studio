import { EncryptedPluginData } from "@/common/appdb/models/EncryptedPluginData";
import { PluginData, PluginDataOptions } from "@/common/appdb/models/PluginData";
import { Manifest, PluginSnapshot, ExtensionRepository, ManifestV1, RegistryMap, PluginSettings } from "@/services/plugin";
import { ExtensionRegistryError, PluginSystemError } from "@/lib/errors";
import { context } from "@/handlers/handlerContext";
import { state } from "@/handlers/handlerState";

type PluginDataScopeName = "currentConnection" | "currentWorkspace";

interface IPluginHandlers {
  "plugin/waitForInit": () => Promise<void>,
  "plugin/plugins": () => Promise<PluginSnapshot[]>
  "plugin/entries": ({ clearCache }: { clearCache: boolean }) => Promise<RegistryMap>
  "plugin/details": ({ id }: { id: string }) => Promise<Partial<ExtensionRepository>>
  "plugin/install": ({ id }: { id: string }) => Promise<Manifest>
  "plugin/update": ({ id }: { id: string }) => Promise<Manifest>
  "plugin/uninstall": ({ id }: { id: string }) => Promise<void>
  "plugin/checkForUpdates": ({ id }: { id: string }) => Promise<boolean>
  "plugin/setPluginSetting": ({ id, key, value }: { id: string, key: keyof PluginSettings, value: boolean }) => Promise<void>
  "plugin/getPluginSetting": ({ id, key }: { id: string, key: keyof PluginSettings }) => Promise<boolean>
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

export const PluginHandlers: IPluginHandlers = {
  "plugin/waitForInit": async () => {
    if (context.pluginManager.isInitialized) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      let duration = 0;
      const interval = setInterval(() => {
        duration += 100;
        if (context.pluginManager.isInitialized) {
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
    return await context.pluginManager.getPlugins();
  },
  "plugin/entries": async ({ clearCache }) => {
    if (clearCache) {
      context.pluginManager.registry.clearCache();
    }
    return await context.pluginManager.registry.getEntries();
  },
  "plugin/details": async ({ id }) => {
    try {
      return await context.pluginManager.getRepository(id);
    } catch (e) {
      if (!(e instanceof ExtensionRegistryError && e.code === "ENTRY_NOT_FOUND")) {
        throw e;
      }
      const plugins = await context.pluginManager.getPlugins();
      const plugin = plugins.find(({ manifest }) => manifest.id === id);
      if (!plugin) {
        throw e;
      }
      try {
        return {
          readme: await context.pluginManager.getPluginAsset(
            plugin.manifest as ManifestV1,
            "README.md",
          ),
        };
      } catch {
        // A plugin without a readme is still reported as missing from the registry.
        throw e;
      }
    }
  },
  "plugin/install": async ({ id }) => {
    return await context.pluginManager.installPlugin(id);
  },
  "plugin/update": async ({ id }) => {
    return await context.pluginManager.updatePlugin(id);
  },
  "plugin/uninstall": async ({ id }) => {
    return await context.pluginManager.uninstallPlugin(id);
  },
  "plugin/checkForUpdates": async ({ id }) => {
    return await context.pluginManager.checkForUpdates(id);
  },
  "plugin/setPluginSetting": async ({ id, key, value }) => {
    await context.pluginManager.setPluginSetting(id, key, value);
  },
  "plugin/getPluginSetting": async ({ id, key }) => {
    return context.pluginManager.getPluginSetting(id, key);
  },
  "plugin/viewEntrypointExists": async ({ pluginId, viewId }) => {
    return context.pluginManager.viewEntrypointExists(pluginId, viewId);
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
    return await context.pluginManager.getPluginAsset(manifest as ManifestV1, path);
  }
};
