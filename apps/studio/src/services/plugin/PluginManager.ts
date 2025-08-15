import _ from "lodash";
import PluginRegistry from "./PluginRegistry";
import PluginFileManager from "./PluginFileManager";
import {
  Manifest,
  PluginRegistryEntry,
  PluginRepository,
  PluginSettings,
  Release,
} from "./types";
import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";
import semver from "semver";
import { NotFoundPluginError, NotSupportedPluginError } from "@commercial/backend/plugin-system/errors";
import bksConfig from "@/common/bksConfig";
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
  installDefaults: BksConfig['plugins']['installDefaults'];
}

export default class PluginManager {
  private initialized = false;
  private registry: PluginRegistry;
  private fileManager: PluginFileManager;
  private installedPlugins: Manifest[] = [];
  private pluginSettings: PluginSettings = {};
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

    await this.reinitialize(options);
  }

  async reinitialize(options: PluginManagerInitializeOptions = {}) {
    this.installedPlugins = this.fileManager.scanPlugins();

    this.pluginSettings = _.cloneDeep(options.pluginSettings) || {};

    this.initialized = true;

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

  getInstalledPlugins(): Manifest[] {
    this.initializeGuard();
    return this.installedPlugins;
  }

  getLoadablePlugins(): Manifest[] {
    this.initializeGuard();
    return this.installedPlugins.filter(this.isPluginLoadable.bind(this));
  }

  isPluginLoadable(manifest: Manifest): boolean {
    return semver.lte(manifest.minAppVersion, this.options.appVersion);
  }

  /** Install the latest version of a plugin. If version is specified, install the specified version. */
  async installPlugin(id: string, version?: string): Promise<Manifest> {
    this.initializeGuard();

    let update = false;

    // If plugin is already installed, perform update
    if (this.installedPlugins.find((manifest) => manifest.id === id)) {
      update = true;
    }

    return await this.withPluginLock(id, async () => {
      const info = await this.registry.getRepository(id);
      if (!info) {
        throw new NotFoundPluginError(`Plugin "${id}" not found in registry.`);
      }

      let release: Release;
      if (version) {
        release = info.releases.find((release) => release.manifest.version === version);

        if (!this.isPluginLoadable(release.manifest)) {
          throw new NotSupportedPluginError(
            `This plugin requires app version ${release.manifest.minAppVersion} or higher. ` +
            `(Plugin version "${version}" does not support app version "${this.options.appVersion}"). ` +
            `Please update Beekeeper Studio or choose a compatible plugin version.`
          );
        }

        if (!release) {
          throw new NotFoundPluginError(`Version "${version}" is not found.`);
        }
      } else {
        release = this.findLatestLoadableReleaseAndThrow(info.releases);
      }

      log.debug(`Installing plugin "${id}" v${release.manifest.version}...`);

      if (update) {
        await this.fileManager.update(id, release);
      } else {
        await this.fileManager.download(id, release);
      }

      const manifest = this.fileManager.getManifest(id);
      const installedPluginIdx = this.installedPlugins.findIndex(
        (manifest) => manifest.id === id
      );
      if (installedPluginIdx === -1) {
        this.installedPlugins.push(manifest);
      } else {
        this.installedPlugins[installedPluginIdx] = manifest;
      }

      this.fillPluginSettings(id);

      log.info(`Installed plugin "${id}" v${release.manifest.version}`);

      return manifest;
    });
  }

  async updatePlugin(id: string, version?: string): Promise<Manifest> {
    this.initializeGuard();
    await this.registry.reloadRepository(id);
    return await this.installPlugin(id, version);
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

    await this.registry.reloadRepository(manifest.id);
    const head = await this.registry.getRepository(manifest.id);

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

  /** Fill the plugin settings with the default values from the config file. */
  fillPluginSettings(id: string) {
    let changed = false;
    if (!this.pluginSettings[id]) {
      this.pluginSettings[id] = _.cloneDeep(this.options.installDefaults);
      changed = true;
    } else {
      for (const [key, value] of Object.entries(bksConfig.plugins.installDefaults)) {
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

  getPluginSettings(id: string): PluginSettings[string] {
    if (!_.has(this.pluginSettings, id)) {
      throw new NotFoundPluginError(`"${id}" not found in plugin settings.`);
    }
    return _.clone(this.pluginSettings[id]);
  }

  private initializeGuard() {
    if (!this.initialized) {
      throw new Error("Plugin manager is not initialized.");
    }
  }

  private findLatestLoadableReleaseAndThrow(releases: Release[]) {
    const sorted = releases
      .slice()
      .sort((a, b) => semver.rcompare(a.manifest.version, b.manifest.version));
    for (const candidate of sorted) {
      // if minAppVersion is not set, we assume it works on any version
      if (!candidate.manifest.minAppVersion) {
        return candidate;
      }

      if (this.isPluginLoadable(candidate.manifest)) {
        return candidate;
      }
    }
    throw new NotSupportedPluginError(
      `Plugin "${releases[0].manifest.id}" is not compatible with app version "${this.options.appVersion}". ` +
      `Please upgrade Beekeeper Studio to use this plugin.`
    );
  }
}
