import rawLog from "@bksLogger";
import Vue from "vue";
import { Manifest, PluginRegistryEntry } from "../types";
import WebPluginLoader from "./WebPluginLoader";

const log = rawLog.scope("WebPluginManager");

export default class WebPluginManager {
  loaders: WebPluginLoader[] = [];
  entries: PluginRegistryEntry[] = [];

  private initialized = false;
  private loaded = false;

  async initialize() {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    // For debugging
    globalThis.webPluginManager = this;

    // Vue helpers
    Vue.prototype.$plugin = {
      getAllEntries: this.getAllEntries.bind(this),
      getEnabledPlugins: this.getEnabledPlugins.bind(this),
      install: this.install.bind(this),
      uninstall: this.uninstall.bind(this),
    };

    await this.loadPlugins();

    this.initialized = true;
  }

  async getAllEntries(): Promise<PluginRegistryEntry[]> {
    if (this.entries.length === 0) {
      this.entries = await Vue.prototype.$util.send("plugin/entries");
    }
    return this.entries;
  }

  async getEnabledPlugins(): Promise<Manifest[]> {
    return this.loaders.map((loader) => loader.manifest);
  }

  private async loadPlugins() {
    if (this.loaded) {
      log.warn(
        "Plugins have already been loaded. Skipping duplicate load attempt."
      );
      log.debug(
        "Calling `loadPlugins` when already loaded. Please call `reloadPlugin` instead."
      );
      return;
    }

    const enabledPlugins: Manifest[] = await Vue.prototype.$util.send(
      "plugin/enabledPlugins"
    );

    for (const manifest of enabledPlugins) {
      try {
        this.loaders.push(await this.loadPlugin(manifest));
      } catch (e) {
        log.error(`Failed to load plugin: ${manifest.id}`, e);
      }
    }

    this.loaded = true;
  }

  private async loadPlugin(manifest: Manifest) {
    const loader = new WebPluginLoader(manifest);
    await loader.load();
    return loader;
  }

  async install(entry: PluginRegistryEntry) {
    const manifest = await Vue.prototype.$util.send("plugin/install", { entry });
    const loader = await this.loadPlugin(manifest);
    this.loaders.push(loader);
    return manifest;
  }

  async uninstall(manifest: Manifest) {
    await Vue.prototype.$util.send("plugin/uninstall", { manifest });
    const loaderIdx = this.loaders.findIndex(
      (loader) => loader.manifest.id === manifest.id
    );
    const [loader] = this.loaders.splice(loaderIdx, 1);
    await loader.unload()
  }

  hasLoadedPlugin(manifest: Manifest) {
    return this.loaders.some((loader) => loader.manifest.id === manifest.id);
  }

  async reloadPlugin(manifest: Manifest) {
    const loader = this.loaders.find(
      (loader) => loader.manifest.id === manifest.id
    );
    if (!loader) {
      throw new Error("Plugin not found: " + manifest.id);
    }
    await loader.unload();
    await loader.load();
  }
}
