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
import semver from "semver";
import { NotFoundPluginError, NotSupportedPluginError } from "@commercial/backend/plugin-system/errors";
import { BksConfig } from "@/common/bksConfig/BksConfigProvider";

const log = rawLog.scope("PluginManager");

export type PluginManagerInitializeOptions = {
  pluginSettings?: PluginSettings;
}

export type PluginManagerOptions = {
  fileManager?: PluginFileManager;
  registry?: PluginRegistry;
  onPluginSettingsChange?: (pluginSettings: PluginSettings) => void;
  appVersion: string;
  defaultConfig: BksConfig['plugins']['default'];
}

export default class PluginManager {
  private initialized = false;
  private registry: PluginRegistry;
  private fileManager: PluginFileManager;
  private plugins: PluginContext[] = [];
  pluginSettings: PluginSettings = {};
  private pluginLocks: string[] = [];

  constructor(readonly options: PluginManagerOptions) {
    this.fileManager = options.fileManager;
    this.registry =
      options.registry ||
      new PluginRegistry(new PluginRepositoryService());
  }

  async initialize(options: PluginManagerInitializeOptions = {}) {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    const installedPlugins = this.fileManager.scanPlugins();

    this.pluginSettings = _.cloneDeep(options.pluginSettings) || {};

    this.plugins = installedPlugins.map((manifest) => ({
      manifest,
      loadable: this.isPluginLoadable(manifest),
    }));

    this.initialized = true;

    const promises = installedPlugins.map(async (plugin) => {
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

  getPlugins(): PluginContext[] {
    this.initializeGuard();
    return this.plugins;
  }

  isPluginLoadable(manifest: Manifest): boolean {
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
          `Plugin "${info.latestRelease.manifest.id}" is not compatible with app version "${this.options.appVersion}". ` +
          `Please upgrade Beekeeper Studio to use this plugin.`
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

      this.fillPluginSettings(id);

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

  /** Fill the plugin settings with the default values from the config file. */
  fillPluginSettings(id: string) {
    let changed = false;
    if (!this.pluginSettings[id]) {
      this.pluginSettings[id] = _.cloneDeep(this.options.defaultConfig);
      changed = true;
    } else {
      for (const [key, value] of Object.entries(this.options.defaultConfig)) {
        if (!_.has(this.pluginSettings[id], key)) {
          this.pluginSettings[id][key] = _.clone(value);
          changed = true;
        }
      }
    }
    if (changed) {
      this.options?.onPluginSettingsChange?.(this.pluginSettings);
    }
  }

  changePluginSettings<T extends keyof PluginSettings[string]>(
    id: string,
    key: T,
    value: PluginSettings[string][T]
  ) {
    this.pluginSettings[id][key] = value;
    this.options?.onPluginSettingsChange?.(this.pluginSettings);
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
