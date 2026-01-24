import _ from "lodash";
import PluginRegistry from "./PluginRegistry";
import PluginFileManager from "./PluginFileManager";
import {
  Manifest,
  PluginContext,
  PluginRegistryEntry,
  PluginRepository,
  PluginSettings,
} from "./types";
import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";
import { UserSetting } from "@/common/appdb/models/user_setting";
import semver from "semver";
import { NotFoundPluginError, NotFoundPluginViewError, NotSupportedPluginError } from "./errors";
import { isManifestV0, mapViewsAndMenuFromV0ToV1 } from "./utils";

const log = rawLog.scope("PluginManager");

export type PluginManagerOptions = {
  fileManager?: PluginFileManager;
  registry?: PluginRegistry;
  appVersion: string;
}

export default class PluginManager {
  private initialized = false;
  private registry: PluginRegistry;
  private fileManager: PluginFileManager;
  private plugins: PluginContext[] = [];
  pluginSettings: PluginSettings = {};
  private pluginLocks: string[] = [];

  /** A Constant for the setting key */
  private static readonly PLUGIN_SETTINGS = "pluginSettings";
  /** This is a list of plugins that are preinstalled by default. When the
   * application starts, these plugins will be installed automatically. The user
   * should be able to uninstall them later. */
  static readonly PREINSTALLED_PLUGINS = ["bks-ai-shell", "bks-er-diagram"];

  constructor(readonly options: PluginManagerOptions) {
    this.fileManager = options.fileManager;
    this.registry =
      options.registry ||
      new PluginRegistry(new PluginRepositoryService());
  }

  async initialize() {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    const installedPlugins = this.fileManager.scanPlugins();

    log.debug("Installed plugins:", installedPlugins);

    await this.loadPluginSettings();

    this.plugins = installedPlugins.map((manifest) => ({
      manifest,
      loadable: this.isPluginLoadable(manifest),
    }));

    this.initialized = true;

    for (const id of PluginManager.PREINSTALLED_PLUGINS) {
      // have installed before?
      if (this.pluginSettings[id]) {
        continue;
      }

      await this.installPlugin(id);
    }


    for (const plugin of installedPlugins) {
      if (
        this.pluginSettings[plugin.id]?.autoUpdate &&
        (await this.checkForUpdates(plugin.id))
      ) {
        await this.updatePlugin(plugin.id);
      }
    }
  }

  async getEntries() {
    this.initializeGuard();
    return await this.registry.getEntries();
  }

  async findPluginEntry(id: string): Promise<PluginRegistryEntry> {
    this.initializeGuard();
    const entries = await this.getEntries();
    const entry = entries.find((entry) => entry.id === id);
    if (!entry) {
      throw new Error(`Plugin "${id}" not found in registry.`);
    }
    return entry;
  }

  /**
   * Check if the view's entrypoint exists. The plugin must be installed,
   * and the view must be defined in the plugin's manifest.
   *
   * @throws if `pluginId` or `viewId` is not found
   **/
  viewEntrypointExists(pluginId: string, viewId: string): boolean {
    const manifest = this.plugins.find((p) => p.manifest.id === pluginId)?.manifest;
    if (!manifest) {
      throw new NotFoundPluginError(`Plugin "${pluginId}" not found.`);
    }
    const { views } = isManifestV0(manifest)
      ? mapViewsAndMenuFromV0ToV1(manifest)
      : manifest.capabilities;
    const view = views.find((v) => v.id === viewId);
    if (!view) {
      throw new NotFoundPluginViewError(
        `View "${viewId}" not found in plugin "${pluginId}".`
      );
    }
    return this.fileManager.viewEntrypointExists(manifest, view);
  }

  async getRepository(pluginId: string): Promise<PluginRepository> {
    this.initializeGuard();
    return await this.registry.getRepository(pluginId);
  }

  getPlugins(): PluginContext[] {
    this.initializeGuard();
    return this.plugins;
  }

  /** Plugin is not loadable if the **current app version** is lower than the
   * **minimum app version** required by the plugin. */
  isPluginLoadable(manifest: Manifest): boolean {
    if (!manifest.minAppVersion) {
      return true;
    }
    return semver.lte(semver.coerce(manifest.minAppVersion), semver.coerce(this.options.appVersion));
  }

  /** Install the latest version of a plugin. */
  async installPlugin(id: string): Promise<Manifest> {
    this.initializeGuard();

    let update = false;

    // If plugin is already installed, perform update
    if (this.plugins.find(({ manifest }) => manifest.id === id)) {
      update = true;
    }

    return await this.withPluginLock(id, async () => {
      const info = await this.registry.getRepository(id);
      if (!info) {
        throw new NotFoundPluginError(`Plugin "${id}" not found in registry.`);
      }

      if (!this.isPluginLoadable(info.latestRelease.manifest)) {
        throw new NotSupportedPluginError(
          `${info.latestRelease.manifest.name} requires Beekeeper Studio ≥ 5.5.0. Please update the app first.`
        );
      }

      log.debug(`Installing plugin "${id}" ${info.latestRelease.manifest.version}...`);

      if (update) {
        await this.fileManager.update(id, info.latestRelease);
      } else {
        await this.fileManager.download(id, info.latestRelease);
      }

      const manifest = this.fileManager.getManifest(id);
      const installedPluginIdx = this.plugins.findIndex(
        ({ manifest }) => manifest.id === id
      );
      const plugin: PluginContext = {
        manifest,
        loadable: this.isPluginLoadable(manifest),
      };
      if (installedPluginIdx === -1) {
        this.plugins.push(plugin);
      } else {
        this.plugins[installedPluginIdx] = plugin;
      }

      if (!this.pluginSettings[id]) {
        this.pluginSettings[id] = {
          autoUpdate: true,
        };
      }
      await this.savePluginSettings();

      log.info(`Installed plugin "${id}" v${info.latestRelease.manifest.version}`);

      return manifest;
    });
  }

  async updatePlugin(id: string): Promise<Manifest> {
    this.initializeGuard();
    await this.registry.reloadRepository(id);
    return await this.installPlugin(id);
  }

  async uninstallPlugin(id: string): Promise<void> {
    this.initializeGuard();
    return await this.withPluginLock(id, async () => {
      log.debug(`Uninstalling plugin "${id}"...`);

      this.fileManager.remove(id);
      this.plugins = this.plugins.filter(
        ({ manifest }) => manifest.id !== id
      );

      log.debug(`Plugin "${id}" uninstalled!`);
    });
  }

  /** if returns true, update is available */
  async checkForUpdates(id: string): Promise<boolean> {
    this.initializeGuard();
    const { manifest } = this.plugins.find(
      ({ manifest }) => manifest.id === id
    );
    if (!manifest) {
      throw new Error(`Plugin "${id}" is not installed.`);
    }

    const head = await this.registry.reloadRepository(manifest.id);

    // latest release is not newer
    if (semver.lte(semver.coerce(head.latestRelease.manifest.version), semver.coerce(manifest.version))) {
      return false;
    }

    return this.isPluginLoadable(head.latestRelease.manifest);
  }

  async getPluginAsset(manifest: Manifest, filename: string): Promise<string> {
    this.initializeGuard();
    return this.fileManager.readAsset(manifest, filename);
  }

  private async withPluginLock<T>(
    id: string,
    callback: () => T | Promise<T>
  ): Promise<T> {
    let ret: T;

    if (this.pluginLocks.includes(id)) {
      throw new Error(`Plugin "${id}" is not idle.`);
    }

    this.pluginLocks.push(id);

    try {
      ret = await callback();
    } finally {
      this.pluginLocks = this.pluginLocks.filter((lock) => lock !== id);
    }

    return ret;
  }

  /**
   * Loads the list of disabled auto-update plugins from the database
   * @todo all plugin settings should be loaded and saved from the config files
   */
  private async loadPluginSettings() {
    const setting = await UserSetting.get(PluginManager.PLUGIN_SETTINGS);
    if (setting && setting.value) {
      this.pluginSettings = setting.value as PluginSettings;
      log.debug(
        `Loaded plugin settings: ${JSON.stringify(this.pluginSettings)}`
      );
    }
  }

  /**
   * Saves the current list of disabled auto-update plugins to the database
   */
  private async savePluginSettings() {
    await UserSetting.set(
      PluginManager.PLUGIN_SETTINGS,
      JSON.stringify(this.pluginSettings)
    );
    log.debug(`Saved plugin settings.`);
  }

  /**
   * Enable or disable automatic update checks for a specific plugin
   */
  async setPluginAutoUpdateEnabled(id: string, enabled: boolean) {
    this.pluginSettings[id].autoUpdate = enabled;
    // Persist the changes to the database
    await this.savePluginSettings();
  }

  /**
   * Get the current auto-update setting for a specific plugin
   */
  getPluginAutoUpdateEnabled(id: string): boolean {
    if (!_.has(this.pluginSettings, id)) {
      log.warn(`Plugin "${id}" not found in plugin settings.`);
      return false;
    }
    return this.pluginSettings[id].autoUpdate;
  }

  private initializeGuard() {
    if (!this.initialized) {
      throw new Error("Plugin manager is not initialized.");
    }
  }

  get isInitialized() {
    return this.initialized;
  }
}
