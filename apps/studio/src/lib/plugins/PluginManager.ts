import _ from "lodash";
import PluginRegistry from "./PluginRegistry";
import PluginFileManager from "./PluginFileManager";
import { Manifest, PluginRegistryEntry, PluginRepositoryInfo } from "./types";
import rawLog from "@bksLogger";

const log = rawLog.scope("PluginManager");

export default class PluginManager {
  private initialized = false;
  private registry: PluginRegistry = new PluginRegistry();
  private fileManager: PluginFileManager = new PluginFileManager();
  private installedPlugins: Manifest[] = [];

  async initialize() {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    this.installedPlugins = this.fileManager.scanPlugins();
    this.initialized = true;
  }

  async getEntries(
    filter: "installed" | "all" = "all"
  ): Promise<PluginRegistryEntry[]> {
    const entries = await this.registry.getEntries();

    if (filter === "installed") {
      return entries.filter((entry) =>
        this.installedPlugins.find((manifest) => manifest.id === entry.id)
      );
    }

    return entries;
  }

  async getInstalledPlugins() {
    return this.installedPlugins;
  }

  async getRepositoryInfo(
    entry: PluginRegistryEntry
  ): Promise<PluginRepositoryInfo> {
    return await this.registry.getRepositoryInfo(entry);
  }

  async installPlugin(
    entry: PluginRegistryEntry
  ): Promise<PluginRepositoryInfo> {
    if (this.installedPlugins.find((manifest) => manifest.id === entry.id)) {
      throw new Error(`Plugin "${entry.id}" is already installed.`);
    }

    log.debug(`Installing plugin "${entry.id}"...`);

    const info = await this.registry.getRepositoryInfo(entry);
    await this.fileManager.download(entry, info.manifest);
    this.installedPlugins.push(info.manifest);

    log.debug(`Plugin "${entry.id}" installed!`);

    return info;
  }

  async updatePlugin(
    entry: PluginRegistryEntry
  ): Promise<PluginRepositoryInfo> {
    if (!this.installedPlugins.find((manifest) => manifest.id === entry.id)) {
      throw new Error(`Plugin "${entry.id}" is not installed.`);
    }

    log.debug(`Updating plugin "${entry.id}"...`);

    const info = await this.registry.getRepositoryInfo(entry, { reload: true });
    await this.fileManager.update(entry, info.manifest);

    log.debug(`Plugin "${entry.id}" updated!`);

    return info;
  }

  async uninstallPlugin(entry: PluginRegistryEntry): Promise<void> {
    if (!this.installedPlugins.find((manifest) => manifest.id === entry.id)) {
      throw new Error(`Plugin "${entry.id}" is not installed.`);
    }

    log.debug(`Uninstalling plugin "${entry.id}"...`);

    this.fileManager.remove(entry);
    this.installedPlugins = this.installedPlugins.filter(
      (manifest) => manifest.id !== entry.id
    );

    log.debug(`Plugin "${entry.id}" uninstalled!`);
  }

  async checkForUpdate(plugin: PluginRegistryEntry): Promise<boolean> {
    const installedPlugin = this.installedPlugins.find(
      (manifest) => manifest.id === plugin.id
    );
    if (!installedPlugin) {
      throw new Error(`Plugin ${plugin.id} not found in registry.`);
    }
    const head = await this.registry.fetchEntryInfo(plugin);
    return head.manifest.version > installedPlugin.version;
  }
}
