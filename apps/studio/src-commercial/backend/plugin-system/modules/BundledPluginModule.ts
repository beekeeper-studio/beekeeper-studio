import path from "path";
import fs from "fs";
import rawLog from "@bksLogger";
import platformInfo from "@/common/platform_info";
import globals from "@/common/globals";
import { Module, type ModuleOptions } from "@/services/plugin/Module";

const log = rawLog.scope("BundledPluginModule");

/**
 * A plugin system module that copies bundled plugins from node_modules (dev)
 * or extraResources (prod) to the user's plugins directory on first launch.
 *
 * @example
 *
 * ```ts
 * const manager = new PluginManager();
 * manager.registerModule(BundledPluginModule);
 * await manager.initialize();
 * ```
 **/
export class BundledPluginModule extends Module {
  constructor(options: ModuleOptions) {
    super(options);

    this.hook("before-initialize", this.installBundledPlugins);
  }

  private async installBundledPlugins() {
    for (const plugin of globals.plugins.ensureInstalled) {
      try {
        await this.ensureInstall(plugin);
      } catch (e) {
        log.error(`Error installing plugin ${plugin}`, e);
      }
    }
  }

  /**
   * Install a plugin from a given path if it is not already installed.
   *
   * @param pkg Package name (e.g., "@beekeeperstudio/bks-ai-shell")
   */
  private async ensureInstall(pkg: string) {
    log.info(`Resolving ${pkg}`);

    const pluginPath = BundledPluginModule.resolve(pkg);
    const pluginsDirectory = this.manager.fileManager.options.pluginsDirectory;

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
    if (this.manager.pluginSettings[pluginId]) {
      log.info(
        `Plugin "${pluginId}" is previously installed, skipping.`
      );
      return;
    }

    const dst = path.join(pluginsDirectory, pluginId);
    if (fs.existsSync(dst)) {
      // This must be set, otherwise the plugin will be copied again
      await this.manager.setPluginAutoUpdateEnabled(pluginId, true);
      log.info(
        `Plugin "${pluginId}" installation directory already exists on disk.`
      );
      return;
    }

    log.info(`Installing plugin ${pluginId}`);
    fs.cpSync(pluginPath, dst, { recursive: true });

    // This must be set, otherwise the plugin will be copied again
    await this.manager.setPluginAutoUpdateEnabled(pluginId, true);
  }

  /**
   * Resolve a bundled plugin path.
   *
   * @param pkg Package name (e.g., "@beekeeperstudio/bks-ai-shell")
   * @returns The resolved path to the plugin directory
   */
  static resolve(pkg: string): string {
    if (platformInfo.env.production) {
      // Production: use extraResources location
      return path.join(platformInfo.resourcesPath, "bundled_plugins", pkg);
    }

    // Development: resolve from node_modules
    const manifestPath = require.resolve(`${pkg}/manifest.json`);
    return path.dirname(manifestPath);
  }
}
