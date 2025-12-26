import { PluginManager } from "@/services/plugin";
import path from "path";
// FIXME: fs-extra is needed for copySync API. Once we upgrade to node >= 22.3.0, this isn't needed.
import fs from "fs-extra";
import rawLog from "@bksLogger";
import platformInfo from "@/common/platform_info";

const log = rawLog.scope('ensureBundledPluginsInstalled');

/**
 * A `PluginManager` hook that copies all plugins from the resource path to the
 * `plugins` directory conditionally.
 *
 * Call this before initializing the plugin manager, e.g.,
 *
 * ```ts
 * const manager = new PluginManager();
 * ensureBundledPluginsInstalled(manager);
 * await manager.initialize();
 * ```
 **/
export default function ensureBundledPluginsInstalled(manager: PluginManager) {
  manager.registerBeforeInitialize(() => {
    try {
      const pluginsDirectory = manager.fileManager.options.pluginsDirectory;

      const bundled = path.join(platformInfo.resourcesPath, 'bundled_plugins');
      const target = path.join(pluginsDirectory);

      if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
      }

      for (const id of fs.readdirSync(bundled)) {
        // have installed before?
        if (manager.pluginSettings[id]) {
          continue;
        }

        log.info(`Copying ${id} to ${target}`);
        const src = path.join(bundled, id);
        const dst = path.join(target, id);
        if (!fs.existsSync(dst)) {
          fs.copySync(src, dst);
        }
      }
    } catch (e) {
      log.error(`Error installing bundled plugin ${id}`, e);
    }
  });
}
