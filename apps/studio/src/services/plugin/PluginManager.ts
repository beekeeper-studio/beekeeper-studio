import _ from "lodash";
import PluginRegistry from "./PluginRegistry";
import PluginFileManager from "./PluginFileManager";
import {
  Manifest,
  PluginRegistryEntry,
  PluginRepository,
  PluginSettings,
} from "./types";
import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";
import { UserSetting } from "@/common/appdb/models/user_setting";

const log = rawLog.scope("PluginManager");

export default class PluginManager {
  private initialized = false;
  private pluginRepositoryService: PluginRepositoryService;
  private registry: PluginRegistry;
  private fileManager: PluginFileManager;
  private installedPlugins: Manifest[] = [];
  private pluginSettings: PluginSettings = {};
  private pluginLocks: string[] = [];

  /** A Constant for the setting key */
  private static readonly PLUGIN_SETTINGS = "pluginSettings";
  /** This is a list of plugins that are preinstalled by default. When the
   * application starts, these plugins will be installed automatically. The user
   * should be able to uninstall them later. */
  private static readonly PREINSTALLED_PLUGINS = ["bks-ai-shell"];

  constructor() {
    this.pluginRepositoryService = new PluginRepositoryService();
    this.fileManager = new PluginFileManager(this.pluginRepositoryService);
    this.registry = new PluginRegistry(this.pluginRepositoryService);
  }

  async initialize() {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    this.installedPlugins = this.fileManager.scanPlugins();

    log.debug(this.installedPlugins);

    await this.loadPluginSettings();

    this.initialized = true;

    for (const id of PluginManager.PREINSTALLED_PLUGINS) {
      // have installed before?
      if (this.pluginSettings[id]) {
        continue;
      }

      await this.installPlugin(id);
    }

    const promises = this.installedPlugins.map(async (plugin) => {
      if (
        this.pluginSettings[plugin.id]?.autoUpdate &&
        (await this.checkForUpdates(plugin.id))
      ) {
        await this.updatePlugin(plugin.id);
      }
    });

    await Promise.allSettled(promises);
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

  async getRepository(pluginId: string): Promise<PluginRepository> {
    this.initializeGuard();
    return await this.registry.getRepository(pluginId);
  }

  // TODO implement enable/disable plugins
  async getEnabledPlugins() {
    this.initializeGuard();
    return this.installedPlugins;
  }

  async installPlugin(id: string): Promise<Manifest> {
    this.initializeGuard();
    if (this.installedPlugins.find((manifest) => manifest.id === id)) {
      throw new Error(`Plugin "${id}" is already installed.`);
    }

    return await this.withPluginLock(id, async () => {
      log.debug(`Installing plugin "${id}"...`);

      const info = await this.registry.getRepository(id);
      await this.fileManager.download(id, info.latestRelease);
      const manifest = this.fileManager.getManifest(id);
      this.installedPlugins.push(manifest);
      if (!this.pluginSettings[id]) {
        this.pluginSettings[id] = {
          autoUpdate: true,
        };
      }
      await this.savePluginSettings();

      log.debug(`Plugin "${id}" installed!`);

      return manifest;
    });
  }

  async updatePlugin(id: string): Promise<Manifest> {
    this.initializeGuard();
    const installedPluginIdx = this.installedPlugins.findIndex(
      (manifest) => manifest.id === id
    );
    if (installedPluginIdx === -1) {
      throw new Error(`Plugin "${id}" is not installed.`);
    }

    return await this.withPluginLock(id, async () => {
      log.debug(`Updating plugin "${id}"...`);

      const info = await this.registry.getRepository(id, { reload: true });
      await this.fileManager.update(id, info.latestRelease);

      const newManifest = this.fileManager.getManifest(id);
      this.installedPlugins[installedPluginIdx] = newManifest;

      log.debug(`Plugin "${id}" updated!`);

      return newManifest;
    });
  }

  async uninstallPlugin(id: string): Promise<void> {
    this.initializeGuard();
    return await this.withPluginLock(id, async () => {
      log.debug(`Uninstalling plugin "${id}"...`);

      this.fileManager.remove(id);
      this.installedPlugins = this.installedPlugins.filter(
        (manifest) => manifest.id !== id
      );

      log.debug(`Plugin "${id}" uninstalled!`);
    });
  }

  /** if returns true, update is available */
  async checkForUpdates(id: string): Promise<boolean> {
    this.initializeGuard();
    const manifest = this.installedPlugins.find(
      (manifest) => manifest.id === id
    );
    if (!manifest) {
      throw new Error(`Plugin "${id}" is not installed.`);
    }

    const head = await this.registry.getRepository(manifest.id, {
      reload: true,
    });

    return head.latestRelease.manifest.version > manifest.version;
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
}
