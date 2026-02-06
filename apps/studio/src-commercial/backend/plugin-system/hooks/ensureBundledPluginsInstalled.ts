import { PluginManager } from "@/services/plugin";
import path from "path";
// FIXME: fs-extra is needed for copySync API. This isn't needed once we upgrade to node >= 22.3.0.
import fs from "fs-extra";
import rawLog from "@bksLogger";
import platformInfo from "@/common/platform_info";

const log = rawLog.scope("ensureBundledPluginsInstalled");

/**
 * A `PluginManager` hook that copies bundled plugins from node_modules (dev)
 * or extraResources (production) to the user's plugins directory on first launch.
 *
 * Call this before initializing the plugin manager, e.g.,
 *
 * ```ts
 * const manager = new PluginManager();
 * ensureBundledPluginsInstalled(manager, ["@beekeeperstudio/bks-ai-shell", "@beekeeperstudio/bks-er-diagram"]);
 * await manager.initialize();
 * ```
 **/
export default function ensureBundledPluginsInstalled(
  manager: PluginManager,
  plugins: string[]
) {
  manager.registerBeforeInitialize(async () => {
    // Install plugins sequentially to avoid race conditions when saving plugin settings
    for (const plugin of plugins) {
      try {
        await install(manager, plugin);
      } catch (e) {
        log.error(`Error installing plugin ${plugin}`, e);
      }
    }
  });
}

/**
 * Install a plugin from a given path.
 *
 * @param manager The plugin manager instance
 * @param pkg Package name (e.g., "@beekeeperstudio/bks-ai-shell")
 */
async function install(manager: PluginManager, pkg: string) {
  log.info(`Resolving ${pkg}`);

  const pluginPath = resolveBundledPluginPath(pkg);
  const pluginsDirectory = manager.fileManager.options.pluginsDirectory;

  if (!fs.existsSync(pluginsDirectory)) {
    fs.mkdirSync(pluginsDirectory, { recursive: true });
  }

  const manifestPath = path.join(pluginPath, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Plugin not found at ${pluginPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const pluginId = manifest.id;

  // Have installed before?
  if (manager.pluginSettings[pluginId]) {
    throw new Error(
      `Plugin "${pluginId}" was previously installed and cannot be installed again.`
    );
  }

  const dst = path.join(pluginsDirectory, pluginId);
  if (fs.existsSync(dst)) {
    // This must be set, otherwise the plugin will be copied again
    await manager.setPluginAutoUpdateEnabled(pluginId, true);
    throw new Error(
      `Plugin "${pluginId}" installation directory already exists on disk.`
    );
  }

  log.info(`Installing plugin ${pluginId}`);
  fs.copySync(pluginPath, dst);

  // This must be set, otherwise the plugin will be copied again
  await manager.setPluginAutoUpdateEnabled(pluginId, true);
}

/**
 * Resolve a bundled plugin path.
 *
 * @param pkg Package name (e.g., "@beekeeperstudio/bks-ai-shell")
 * @returns The resolved path to the plugin directory
 */
export function resolveBundledPluginPath(pkg: string): string {
  if (platformInfo.env.production) {
    // Production: use extraResources location
    return path.join(platformInfo.resourcesPath, "bundled_plugins", pkg);
  }

  // Development: resolve from node_modules
  const manifestPath = require.resolve(`${pkg}/manifest.json`);
  return path.dirname(manifestPath);
}

