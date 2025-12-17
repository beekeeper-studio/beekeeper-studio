import _ from "lodash";
import PluginRegistry from "./PluginRegistry";
import PluginFileManager from "./PluginFileManager";
import {
  Manifest,
  TransportPlugin,
  PluginRegistryEntry,
  PluginRepository,
  PluginSettings,
} from "./types";
import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";
import { UserSetting } from "@/common/appdb/models/user_setting";
import semver from "semver";
import { NotFoundPluginError, NotSupportedPluginError } from "./errors";

const log = rawLog.scope("PluginManager");

export type PluginManagerOptions = {
  /** Per-plugin configuration, keyed by plugin ID. */
  pluginSettings?: PluginSettings;
  /** @todo Settings that apply to the plugin system as a whole. */
  systemSettings?: unknown;
  fileManager: PluginFileManager;
  /** You probably don't need to pass this. It's available for testing. */
  registry?: PluginRegistry;
  appVersion: string;
}

type InstallGuard = (pluginId: string) => void;
type PluginContextTransformer = (pluginContext: TransportPlugin, plugins: TransportPlugin[]) => TransportPlugin;

export default class PluginManager {
  private initialized = false;
  private registry: PluginRegistry;
  private fileManager: PluginFileManager;
  /** A list of installed plugins */
  private plugins: TransportPlugin[] = [];
  pluginSettings: PluginSettings = {};
  private pluginLocks: string[] = [];
  private installGuards: InstallGuard[] = [];
  private pluginContextTransformers: PluginContextTransformer[] = [];

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

    for (const manifest of installedPlugins) {
      this.createOrUpdateTransportPlugin(manifest);
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
      if (
        this.pluginSettings[plugin.id]?.autoUpdate &&
        (await this.checkForUpdates(plugin.id))
      ) {
        await this.updatePlugin(plugin.id).catch((e) => {
          log.error(`Failed to update plugin "${plugin.id}"`, plugin, e);
        });
      }
    }
  }

  async getEntries(refresh?: boolean) {
    this.initializeGuard();
    return await this.registry.getEntries(refresh);
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

  /** Get the list of installed plugins */
  getPlugins(): TransportPlugin[] {
    this.initializeGuard();
    return this.plugins;
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
  async installPlugin(id: string): Promise<TransportPlugin> {
    this.initializeGuard();
    this.installGuard(id);

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

      const transport = this.createOrUpdateTransportPlugin(manifest);

      if (!this.pluginSettings[id]) {
        this.pluginSettings[id] = {
          autoUpdate: true,
        };
      }
      await this.savePluginSettings();

      log.info(`Installed plugin "${id}" v${info.latestRelease.manifest.version}`);

      return transport;
    });
  }

  async updatePlugin(id: string): Promise<TransportPlugin> {
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

  /** If no manifest found, push it to the list
   *  If manifest found, update it */
  private createOrUpdateTransportPlugin(manifest: Manifest): TransportPlugin {
    const pluginIdx = this.plugins
      .findIndex((plugin) => plugin.manifest.id === manifest.id);

    const compatible = this.checkCompatibility(manifest);

    const disabled = typeof this.options.pluginSettings?.[manifest.id]?.disabled === "boolean"
      ? this.options.pluginSettings?.[manifest.id]?.disabled
      : false;

    const context = this.applyPluginContextTransformers({
      manifest,
      compatible,
      disabled,
      loadable: compatible,
    });

    if (pluginIdx === -1) {
      this.plugins.push(context);
    } else {
      this.plugins[pluginIdx] = context;
    }

    return context;
  }

  addInstallGuard(guard: InstallGuard) {
    this.installGuards.push(guard);
  }

  private installGuard(id: string) {
    for (const guard of this.installGuards) {
      guard(id);
    }
  }

  addPluginContextTransformer(transformer: PluginContextTransformer) {
    this.pluginContextTransformers.push(transformer);
  }

  private applyPluginContextTransformers(pluginContext: TransportPlugin) {
    for (const transformer of this.pluginContextTransformers) {
      pluginContext = transformer(pluginContext, this.plugins);
    }
    return pluginContext;
  }
}
