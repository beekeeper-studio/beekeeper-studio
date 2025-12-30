import _ from "lodash";
import PluginRegistry from "./PluginRegistry";
import PluginFileManager from "./PluginFileManager";
import {
  Manifest,
  PluginSnapshot,
  PluginRegistryEntry,
  PluginRepository,
  PluginSettings,
  PluginOrigin,
} from "./types";
import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";
import { UserSetting } from "@/common/appdb/models/user_setting";
import semver from "semver";
import { NotFoundPluginError, NotSupportedPluginError } from "./errors";
import { convertToManifestV1 } from "./utils";

const log = rawLog.scope("PluginManager");

export type PluginManagerOptions = {
  /** @todo Settings that apply to the plugin system as a whole. */
  systemSettings?: unknown;
  fileManager: PluginFileManager;
  registry?: PluginRegistry;
  appVersion: string;

  /** This is triggered when registry module fails to fetch during initialization, e.g. if the app runs in offline. */
  initialRegistryFallback?: () => Promise<PluginRegistryEntry[]>;
}

type InstallGuard = (plugin: { id: string; origin: PluginOrigin }) => void | Promise<void>;
type PluginSnapshotTransformer = (snapshot: PluginSnapshot, currentSnapshots: PluginSnapshot[]) => PluginSnapshot | Promise<PluginSnapshot>;

/**
 * PluginManager is the central coordinator of the plugin system.
 * It exposes high-level operations such as installing, updating,
 * and listing plugins, while delegating most responsibilities to
 * specialized classes:
 *
 * 1. PluginFileManager
 *    Handles filesystem-related operations, including reading and
 *    writing plugin manifests, downloading plugin assets, and
 *    removing installed plugins.
 *
 * 2. PluginRegistry
 *    Reads `plugins.json` and `community-plugins.json` from the
 *    registry repository. It resolves plugin metadata, repositories,
 *    and available versions. Results are cached internally.
 *    Network access is delegated to PluginRepositoryService.
 *
 * 3. PluginRepositoryService
 *    Responsible solely for fetching data from plugin repositories
 *    via Octokit. This layer performs no caching and defines all
 *    external API calls used by the plugin system.
 *
 * PluginManager behavior can be extended via hooks such as
 * `addInstallGuard` and `addPluginSnapshotTransformer`.
 *
 * For details about the plugin lifecycle (e.g. iframe execution),
 * see the WebPluginManager class.
 */
export default class PluginManager {
  private initialized: boolean;
  private registry: PluginRegistry;
  private fileManager: PluginFileManager;
  /** A list of installed plugins */
  private plugins: PluginSnapshot[];
  pluginSettings: PluginSettings;
  private pluginLocks: string[];
  /** Guards that run before plugin installation to enforce constraints */
  private installGuards: InstallGuard[];
  /** Transformers that modify plugin snapshots during installation/update */
  private pluginSnapshotTransformers: { transformer: PluginSnapshotTransformer, priority: number }[];

  /** A Constant for the setting key */
  private static readonly PLUGIN_SETTINGS = "pluginSettings";
  /** This is a list of plugins that are preinstalled by default. When the
   * application starts, these plugins will be installed automatically. The user
   * should be able to uninstall them later. */
  static readonly PREINSTALLED_PLUGINS = ["bks-ai-shell", "bks-er-diagram"];

  /** WARNING: For development purposes only. I still don't know if we truly
   * want to use singleton in the future. */
  private static devInstance: PluginManager;

  constructor(readonly options: PluginManagerOptions) {
    PluginManager.devInstance = this;
    this.fileManager = options.fileManager;
    this.registry = options.registry || new PluginRegistry(new PluginRepositoryService());
    this.reset();
  }

  reset() {
    this.plugins = [];
    this.pluginSettings = {};
    this.pluginLocks = [];
    this.installGuards = [];
    this.pluginSnapshotTransformers = [];
    this.initialized = false;
  }

  /** WARNING: For development purposes only. */
  static devGetInstance() {
    if (!PluginManager.devInstance) {
      log.error("PluginManager.devGetInstance() called before PluginManager was initialized");
      return;
    }
    return PluginManager.devInstance;
  }

  async initialize() {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    const installedPlugins = this.fileManager.scanPlugins();

    log.debug("Installed plugins:", installedPlugins);

    await this.loadPluginSettings();

    const { errors } = await this.registry.fetch();
    if (errors.core || errors.community) {
      // TODO show errors to user?
      if (this.options.initialRegistryFallback) {
        const entries = await this.options.initialRegistryFallback();
        this.registry.entries = entries;
      }
    }

    for (const manifest of installedPlugins) {
      await this.upsertPluginSnapshot(manifest);
    }

    this.initialized = true;

    for (const id of PluginManager.PREINSTALLED_PLUGINS) {
      // have installed before?
      if (this.pluginSettings[id]) {
        continue;
      }

      await this.installPlugin(id).catch((e) => {
        log.error(`Failed to install preinstalled plugin "${id}"`, e);
      });
    }


    for (const plugin of installedPlugins) {
      const autoUpdate = this.pluginSettings[plugin.id]?.autoUpdate;
      if (autoUpdate) {
        try {
          const shouldUpdate = await this.checkForUpdates(plugin.id);
          if (shouldUpdate) {
            await this.updatePlugin(plugin.id);
          }
        } catch (e) {
          log.error(`Failed to update plugin "${plugin.id}"`, plugin, e);
        }
      }
    }
  }

  async getEntries(refresh?: boolean) {
    this.initializeGuard();
    if (refresh) {
      await this.registry.fetch();
    }
    return this.registry.entries;
  }

  async getRepository(pluginId: string): Promise<PluginRepository> {
    this.initializeGuard();
    return await this.registry.getRepository(pluginId);
  }

  /** Get the list of installed plugins */
  getInstalledPlugins(): PluginSnapshot[] {
    this.initializeGuard();
    return this.plugins;
  }

  findInstalledPlugin(id: string) {
    return this.getInstalledPlugins().find(({ manifest }) => manifest.id === id);
  }

  /** Plugin is not compatible if the **current app version** is lower than the
   * **minimum app version** required by the plugin. */
  private checkCompatibility(manifest: Manifest): boolean {
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

    const entry = this.registry.findEntryById(id);

    if (!entry) {
      throw new NotFoundPluginError(`Plugin "${id}" not found in registry.`);
    }

    await this.installGuard({ id, origin: entry.metadata.origin });

    return await this.withPluginLock(id, async () => {
      const info = await this.registry.getRepository(id);
      if (!info) {
        throw new NotFoundPluginError(`Plugin "${id}" not found in registry.`);
      }

      if (!this.checkCompatibility(info.latestRelease.manifest)) {
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

      await this.upsertPluginSnapshot(manifest);

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

    return this.checkCompatibility(head.latestRelease.manifest);
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
   * Saves the current list of auto-update plugins to the database
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

  private async upsertPluginSnapshot(manifest: Manifest): Promise<PluginSnapshot> {
    const pluginIdx = this.plugins
      .findIndex((plugin) => plugin.manifest.id === manifest.id);
    const compatible = this.checkCompatibility(manifest);
    const entry = this.registry.findEntryById(manifest.id);
    const origin: PluginOrigin = entry?.metadata.origin || "unpublished";

    // Convert v0 manifests to v1 format before creating snapshot
    const manifestV1 = convertToManifestV1(manifest);

    const snapshot = await this.applyPluginSnapshotTransformers({
      manifest: manifestV1,
      compatible,
      disabled: false,
      origin,
    });

    if (pluginIdx === -1) {
      this.plugins.push(snapshot);
    } else {
      this.plugins[pluginIdx] = snapshot;
    }

    return snapshot;
  }

  addInstallGuard(guard: InstallGuard) {
    this.installGuards.push(guard);
  }

  private async installGuard(params: Parameters<InstallGuard>[0]) {
    for (const guard of this.installGuards) {
      await guard(params);
    }
  }

  addPluginSnaphostTransformer(
    transformer: PluginSnapshotTransformer,
    priority = 0
  ) {
    this.pluginSnapshotTransformers.push({ transformer, priority });
  }

  private async applyPluginSnapshotTransformers(pluginContext: PluginSnapshot) {
    for (const { transformer } of this.pluginSnapshotTransformers.sort((a, b) => b.priority - a.priority)) {
      pluginContext = await transformer(pluginContext, this.plugins);
    }
    return pluginContext;
  }
}
