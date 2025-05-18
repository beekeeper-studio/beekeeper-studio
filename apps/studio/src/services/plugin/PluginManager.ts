import _ from "lodash";
import PluginRegistry from "./PluginRegistry";
import PluginFileManager from "./PluginFileManager";
import {
  CommonPluginInfo,
  Manifest,
  PluginRegistryEntry,
  PluginRepositoryInfo,
} from "./types";
import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";

const log = rawLog.scope("PluginManager");

export default class PluginManager {
  private initialized = false;
  private pluginRepositoryService: PluginRepositoryService;
  private registry: PluginRegistry;
  private fileManager: PluginFileManager;
  private installedPlugins: Manifest[];

  constructor() {
    this.pluginRepositoryService = new PluginRepositoryService();
    this.fileManager = new PluginFileManager(this.pluginRepositoryService);
    this.registry = new PluginRegistry(this.pluginRepositoryService);
    this.installedPlugins = [];
  }

  async initialize() {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    this.installedPlugins = this.fileManager.scanPlugins();
    this.initialized = true;
  }

  async getEntries(): Promise<PluginRegistryEntry[]> {
    return await this.registry.getEntries();
  }

  async getRepositoryInfo(
    entry: PluginRegistryEntry
  ): Promise<PluginRepositoryInfo> {
    return await this.registry.getRepositoryInfo(entry);
  }

  // TODO implement enable/disable plugins
  async getEnabledPlugins() {
    return this.installedPlugins;
  }

  async installPlugin(entry: PluginRegistryEntry): Promise<Manifest> {
    if (this.installedPlugins.find((manifest) => manifest.id === entry.id)) {
      throw new Error(`Plugin "${entry.id}" is already installed.`);
    }

    log.debug(`Installing plugin "${entry.id}"...`);

    const info = await this.registry.getRepositoryInfo(entry);
    await this.fileManager.download(entry, info.latestRelease);
    const manifest = this.fileManager.getManifest(entry.id);
    this.installedPlugins.push(manifest);

    log.debug(`Plugin "${entry.id}" installed!`);

    return manifest;
  }

  async updatePlugin(entry: PluginRegistryEntry): Promise<void> {
    if (!this.installedPlugins.find((manifest) => manifest.id === entry.id)) {
      throw new Error(`Plugin "${entry.id}" is not installed.`);
    }

    log.debug(`Updating plugin "${entry.id}"...`);

    const info = await this.registry.getRepositoryInfo(entry, { reload: true });
    await this.fileManager.update(entry, info.latestRelease);

    const installedPluginIdx = this.installedPlugins.findIndex(
      (manifest) => manifest.id === entry.id
    );
    this.installedPlugins[installedPluginIdx] = this.fileManager.getManifest(
      entry.id
    );

    log.debug(`Plugin "${entry.id}" updated!`);
  }

  async uninstallPlugin(manifest: Manifest): Promise<void> {
    if (!this.installedPlugins.find((plugin) => plugin.id === manifest.id)) {
      throw new Error(`Plugin "${manifest.id}" is not installed.`);
    }

    log.debug(`Uninstalling plugin "${manifest.id}"...`);

    this.fileManager.remove(manifest);
    this.installedPlugins = this.installedPlugins.filter(
      (manifest) => manifest.id !== manifest.id
    );

    log.debug(`Plugin "${manifest.id}" uninstalled!`);
  }

  /** if returns true, a new version is available */
  async checkForUpdates(plugin: PluginRegistryEntry): Promise<boolean> {
    const installedPlugin = this.installedPlugins.find(
      (manifest) => manifest.id === plugin.id
    );
    if (!installedPlugin) {
      throw new Error(`Plugin ${plugin.id} not found in registry.`);
    }

    const head = await this.registry.getRepositoryInfo(plugin, {
      reload: true,
    });
    return head.latestRelease.version > installedPlugin.version;
  }

  async getPluginAsset(manifest: Manifest, filename: string): Promise<string> {
    return this.fileManager.readAsset(manifest, filename);
  }
}
