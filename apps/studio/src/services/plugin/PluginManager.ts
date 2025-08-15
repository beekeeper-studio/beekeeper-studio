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

const log = rawLog.scope("PluginManager");

export type PluginManagerInitializeOptions = {
  /** These plugins will be installed automatically. Users should be able to uninstall them later. */
  preinstalledPlugins?: Manifest['id'][];
  pluginSettings?: PluginSettings;
}

export type PluginManagerOptions = {
  fileManager?: PluginFileManager;
  registry?: PluginRegistry;
  onSetPluginSettings?: (pluginSettings: PluginSettings) => void;
  appVersion: string;
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

    this.installedPlugins = this.fileManager.scanPlugins();

    this.pluginSettings = _.cloneDeep(options.pluginSettings) || {};

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
    if (this.installedPlugins.find((manifest) => manifest.id === id)) {
      throw new Error(`Plugin "${id}" is already installed.`);
    }

    return await this.withPluginLock(id, async () => {
      log.debug(`Installing plugin "${id}"...`);

      const info = await this.registry.getRepository(id);
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
      await this.fileManager.download(id, release);
      const manifest = this.fileManager.getManifest(id);
      this.installedPlugins.push(manifest);
      if (!this.pluginSettings[id]) {
        this.pluginSettings[id] = {
          autoUpdate: true,
        };
      }
      this.options?.onSetPluginSettings?.(this.pluginSettings);

      log.debug(`Plugin "${id}" installed!`);

      return manifest;
    });
  }

  async updatePlugin(id: string, version?: string): Promise<Manifest> {
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
      await this.fileManager.update(id, release);

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
    this.options?.onSetPluginSettings?.(this.pluginSettings);
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
