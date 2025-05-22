import _ from "lodash";
import PluginRegistry from "./PluginRegistry";
import PluginFileManager from "./PluginFileManager";
import { Manifest, PluginRegistryEntry, PluginRepository } from "./types";
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
  private disabledAutoUpdatePlugins: Set<string> = new Set();
  private pluginLocks: Map<string, boolean> = new Map();

  // Define a constant for the setting key
  private static readonly DISABLED_AUTO_UPDATE_PLUGINS =
    "disabledAutoUpdatePlugins";

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
    for (const plugin of this.installedPlugins) {
      this.pluginLocks.set(plugin.id, false);
    }

    await this.loadDisabledAutoUpdatePlugins();

    this.initialized = true;

    this.installedPlugins.map(async (plugin) => {
      if (this.disabledAutoUpdatePlugins.has(plugin.id)) {
        return;
      }
      if (await this.checkForUpdates(plugin.id)) {
        await this.updatePlugin(plugin.id);
      }
    });
  }

  async getEntries() {
    return await this.registry.getEntries();
  }

  async findPluginEntry(id: string): Promise<PluginRegistryEntry> {
    const entries = await this.getEntries();
    const entry = entries.find((entry) => entry.id === id);
    if (!entry) {
      throw new Error(`Plugin "${id}" not found in registry.`);
    }
    return entry;
  }

  async getRepository(pluginId: string): Promise<PluginRepository> {
    return await this.registry.getRepository(pluginId);
  }

  // TODO implement enable/disable plugins
  async getEnabledPlugins() {
    return this.installedPlugins;
  }

  async installPlugin(id: string): Promise<Manifest> {
    if (this.installedPlugins.find((manifest) => manifest.id === id)) {
      throw new Error(`Plugin "${id}" is already installed.`);
    }

    return await this.withPluginLock(id, async () => {
      log.debug(`Installing plugin "${id}"...`);

      const info = await this.registry.getRepository(id);
      await this.fileManager.download(id, info.latestRelease);
      const manifest = this.fileManager.getManifest(id);
      this.installedPlugins.push(manifest);

      log.debug(`Plugin "${id}" installed!`);

      return manifest;
    });
  }

  async updatePlugin(id: string): Promise<void> {
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

      this.installedPlugins[installedPluginIdx] =
        this.fileManager.getManifest(id);

      log.debug(`Plugin "${id}" updated!`);
    });
  }

  async uninstallPlugin(id: string): Promise<void> {
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
    return this.fileManager.readAsset(manifest, filename);
  }

  private async withPluginLock<T>(
    id: string,
    callback: () => T | Promise<T>
  ): Promise<T> {
    let ret: T;

    if (this.pluginLocks.get(id)) {
      throw new Error(`Plugin "${id}" is not idle.`);
    }

    this.pluginLocks.set(id, true);

    try {
      ret = await callback();
    } finally {
      this.pluginLocks.set(id, false);
    }

    return ret;
  }

  /**
   * Loads the list of disabled auto-update plugins from the database
   */
  private async loadDisabledAutoUpdatePlugins() {
    const setting = await UserSetting.get(
      PluginManager.DISABLED_AUTO_UPDATE_PLUGINS
    );
    if (setting && setting.value) {
      const disabledPlugins = setting.value as string[];
      this.disabledAutoUpdatePlugins = new Set(disabledPlugins);
      log.debug(
        `Loaded ${disabledPlugins.length} disabled auto-update plugins`
      );
    }
  }

  /**
   * Saves the current list of disabled auto-update plugins to the database
   */
  private async saveDisabledAutoUpdatePlugins() {
    const disabledPlugins = Array.from(this.disabledAutoUpdatePlugins);
    await UserSetting.set(
      PluginManager.DISABLED_AUTO_UPDATE_PLUGINS,
      JSON.stringify(disabledPlugins)
    );
    log.debug(`Saved ${disabledPlugins.length} disabled auto-update plugins`);
  }

  /**
   * Enable or disable automatic update checks for a specific plugin
   */
  async setPluginAutoUpdateEnabled(id: string, enabled: boolean) {
    if (enabled) {
      this.disabledAutoUpdatePlugins.delete(id);
    } else {
      this.disabledAutoUpdatePlugins.add(id);
    }

    // Persist the changes to the database
    await this.saveDisabledAutoUpdatePlugins();
  }

  /**
   * Get the current auto-update setting for a specific plugin
   */
  getPluginAutoUpdateEnabled(id: string): boolean {
    return !this.disabledAutoUpdatePlugins.has(id);
  }
}
