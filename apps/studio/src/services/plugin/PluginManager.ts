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

const log = rawLog.scope("PluginManager");

export type PluginManagerInitializeOptions = {
  /** These plugins will be installed automatically. Users should be able to uninstall them later. */
  preinstalledPlugins?: Manifest['id'][];
  pluginSettings?: PluginSettings;
  onSetPluginSettings?: (pluginSettings: PluginSettings) => void;
}

export type PluginManagerOptions = {
  fileManager?: PluginFileManager;
}

export default class PluginManager {
  private initialized = false;
  private pluginRepositoryService: PluginRepositoryService;
  private registry: PluginRegistry;
  private fileManager: PluginFileManager;
  private installedPlugins: Manifest[] = [];
  private pluginSettings: PluginSettings = {};
  private pluginLocks: string[] = [];
  private onSavePluginSettings?: (pluginSettings: PluginSettings) => void;

  constructor(readonly options: PluginManagerOptions = {}) {
    this.pluginRepositoryService = new PluginRepositoryService();
    this.fileManager = options.fileManager || new PluginFileManager();
    this.registry = new PluginRegistry(this.pluginRepositoryService);
  }

  async initialize(options: PluginManagerInitializeOptions = {}) {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    this.installedPlugins = this.fileManager.scanPlugins();

    this.pluginSettings = options.pluginSettings || {};

    this.initialized = true;

    for (const id of options.preinstalledPlugins || []) {
      // have installed `id` before?
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
      this.onSavePluginSettings?.(this.pluginSettings);

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
   * Enable or disable automatic update checks for a specific plugin
   */
  async setPluginAutoUpdateEnabled(id: string, enabled: boolean) {
    this.pluginSettings[id].autoUpdate = enabled;
    this.onSavePluginSettings?.(this.pluginSettings);
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
