import rawLog from "@bksLogger";
import Vue from "vue";
import { Manifest } from "../types";
import WebPluginLoader from "./WebPluginLoader";

const log = rawLog.scope("WebPluginManager");

export default class WebPluginManager {
  loaders: WebPluginLoader[] = [];

  private initialized = false;

  async initialize() {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    const plugins: Manifest[] = await Vue.prototype.$util.send(
      "plugin/getActivePlugins"
    );

    for (const plugin of plugins) {
      this.loaders.push(new WebPluginLoader(plugin));
    }

    // For debugging
    globalThis.webPluginManager = this;

    await this.loadPlugins();

    this.initialized = true;
  }

  private async loadPlugins() {
    for (const loader of this.loaders) {
      try {
        await loader.load();
      } catch (err) {
        log.error(err);
      }
    }
  }

  async reloadPlugin(id: Manifest["id"]) {
    const loader = this.loaders.find((loader) => loader.manifest.id === id);

    if (!loader) {
      throw new Error(`Plugin ${id} not found`);
    }

    await loader.unload();
    await loader.load();
  }
}
