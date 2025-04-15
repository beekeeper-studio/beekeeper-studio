import type { UtilityConnection } from "@/lib/utility/UtilityConnection";
import rawLog from "@bksLogger";
import {
  Manifest,
  PluginRegistryEntry,
  PluginRepositoryInfo,
  PluginRequestData,
  PluginResponseData,
} from "../types";
import PluginStoreService from "./PluginStoreService";
import WebPluginLoader from "./WebPluginLoader";

const log = rawLog.scope("WebPluginManager");

export default class WebPluginManager {
  /** A map of plugin id -> loader */
  loaders: Map<string, WebPluginLoader> = new Map();

  private initialized = false;

  constructor(
    private utilityConnection: UtilityConnection,
    private pluginStore: PluginStoreService
  ) { }

  async initialize() {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    const enabledPlugins: Manifest[] = await this.utilityConnection.send(
      "plugin/enabledPlugins"
    );

    for (const manifest of enabledPlugins) {
      try {
        await this.loadPlugin(manifest);
      } catch (e) {
        log.error(`Failed to load plugin: ${manifest.id}`, e);
      }
    }

    this.initialized = true;
  }

  async getAllEntries(): Promise<PluginRegistryEntry[]> {
    return await this.utilityConnection.send("plugin/entries");
  }

  // TODO implement enable/disable plugins
  async getEnabledPlugins(): Promise<Manifest[]> {
    return [...this.loaders.values()].map((loader) => loader.manifest);
  }

  async getRepositoryInfo(
    entry: PluginRegistryEntry
  ): Promise<PluginRepositoryInfo> {
    return await this.utilityConnection.send("plugin/repositoryInfo", {
      entry,
    });
  }

  private async loadPlugin(manifest: Manifest) {
    if (this.loaders.has(manifest.id)) {
      log.warn(`Plugin "${manifest.id}" already loaded. Skipping...`);
      return this.loaders.get(manifest.id);
    }

    const loader = new WebPluginLoader(
      manifest,
      this.utilityConnection,
      this.pluginStore
    );
    await loader.load();
    this.loaders.set(manifest.id, loader);
    return loader;
  }

  async install(entry: PluginRegistryEntry) {
    const manifest = await this.utilityConnection.send("plugin/install", {
      entry,
    });
    await this.loadPlugin(manifest);
    return manifest;
  }

  async uninstall(manifest: Manifest) {
    await this.utilityConnection.send("plugin/uninstall", { manifest });
    const loader = this.loaders.get(manifest.id);
    if (!loader) {
      throw new Error("Plugin not found: " + manifest.id);
    }
    await loader.unload();
    this.loaders.delete(manifest.id);
  }

  async reloadPlugin(manifest: Manifest) {
    const loader = this.loaders.get(manifest.id);
    if (!loader) {
      throw new Error("Plugin not found: " + manifest.id);
    }
    await loader.unload();
    await loader.load();
  }

  /** Handle messages from iframes */
  async handleRequestFromSandbox(pluginId: string, data: PluginRequestData) {
    this.checkPermission(pluginId, data);

    const response: PluginResponseData = {
      id: data.id,
    };

    switch (data.name) {
      case "getTables":
        response.result = this.pluginStore.getTables();
        break;
      case "getColumns":
        response.result = await this.pluginStore.getColumns(data.args.table);
        break;
      case "getConnectionInfo":
        response.result = this.pluginStore.getConnectionInfo();
        break;
      case "getActiveTab":
        response.result = this.pluginStore.getActiveTab();
        break;
      case "updateQueryText":
        this.pluginStore.updateQueryText(data.args.tabId, data.args.query);
        break;
      default:
        log.warn(`Unknown request: ${data.name}`);
        response.error = new Error(`Unknown request: ${data.name}`);
    }

    return response;
  }

  checkPermission(pluginId: string, data: PluginRequestData) {
    // do nothing on purpose
    // if not permitted, throw error
  }
}
