import path from "path";
import fs from "fs";
import semver from "semver";
import rawLog from "@bksLogger";
import platformInfo from "@/common/platform_info";
import globals from "@/common/globals";
import { Module, type ModuleOptions } from "@/services/plugin/Module";
import type PluginManager from "@/services/plugin/PluginManager";
import type { Manifest } from "@/services/plugin/types";

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
    this.makePluginsDir();

    for (const { pkg } of globals.plugins.ensureInstalled) {
      try {
        await this.ensureInstalled(pkg);
      } catch (e) {
        log.error(`Error installing plugin ${pkg}`, e);
      }
    }
  }

  private makePluginsDir() {
    const pluginsDirectory = this.manager.fileManager.options.pluginsDirectory;
    if (!fs.existsSync(pluginsDirectory)) {
      fs.mkdirSync(pluginsDirectory, { recursive: true });
    }
  }

  /**
   * Install a bundled plugin, or update it if the bundled copy is newer.
   *
   * @param pkg Package name (e.g., "@beekeeperstudio/bks-ai-shell")
   */
  private async ensureInstalled(pkg: string) {
    log.info(`Resolving ${pkg}`);

    const plugin = new BundledPlugin(this.manager, pkg);

    if (plugin.isUninstalledByUser()) {
      // Uninstalled by the user, so don't bring it back.
      return;
    }

    if (!plugin.isInstalled()) {
      return await plugin.install();
    }

    if (plugin.isUpdateAvailable()) {
      await plugin.update();
    }
  }
}

export class BundledPlugin {
  private readonly sourceManifest: Manifest;
  private readonly sourceDir: string;
  private readonly targetDir: string;

  /** @param pkg Package name (e.g., "@beekeeperstudio/bks-ai-shell") */
  constructor(private readonly manager: PluginManager, pkg: string) {
    const sourceDir = BundledPlugin.resolve(pkg);

    const rawManifest = fs.readFileSync(
      path.join(sourceDir, "manifest.json"),
      "utf-8"
    );

    this.sourceManifest = JSON.parse(rawManifest);
    this.sourceDir = sourceDir;
    this.targetDir = manager.fileManager.getDirectoryOf(this.sourceManifest);
  }

  static resolve(pkg: string) {
    return platformInfo.env.production
      ? path.join(platformInfo.resourcesPath, "bundled_plugins", pkg)
      : path.dirname(require.resolve(`${pkg}/manifest.json`));
  }

  isInstalled(): boolean {
    return fs.existsSync(this.targetDir);
  }

  isUninstalledByUser(): boolean {
    return (
      !this.isInstalled() &&
      !!this.manager.pluginSettings[this.sourceManifest.id]
    );
  }

  isUpdateAvailable(): boolean {
    return semver.gt(this.getBundledVersion(), this.getInstalledVersion());
  }

  private getBundledVersion() {
    return semver.coerce(this.sourceManifest.version);
  }

  private getInstalledVersion() {
    const installedPath = path.join(this.targetDir, "manifest.json");
    const installed = JSON.parse(fs.readFileSync(installedPath, "utf-8"));
    return semver.coerce(installed.version);
  }

  async install() {
    log.info(`Installing plugin ${this.sourceManifest.id}`);

    fs.cpSync(this.sourceDir, this.targetDir, { recursive: true });

    // HACK: This must be set, otherwise the plugin will be copied again
    await this.manager.setPluginAutoUpdateEnabled(this.sourceManifest.id, true);
  }

  async update() {
    log.info(
      `Updating plugin ${this.sourceManifest.id} to v${this.sourceManifest.version}`
    );

    fs.rmSync(this.targetDir, { recursive: true, force: true });
    fs.cpSync(this.sourceDir, this.targetDir, { recursive: true });

    // HACK: This must be set, otherwise the plugin will be copied again
    await this.manager.setPluginAutoUpdateEnabled(this.sourceManifest.id, true);
  }
}
