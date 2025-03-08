import rawLog from "@bksLogger";
import Vue from "vue";
import Plugin from "../Plugin";
import { Manifest } from "../types";
import WebPluginInjector from "./WebPluginInjector";

const log = rawLog.scope("WebPluginInjectorManager");

export default class WebPluginManager {
  injectors: WebPluginInjector[] = [];
  pluginInstances: Record<Manifest["id"], Plugin> = {};

  private initialized = false;

  async initialize() {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    const plugins: Manifest[] = await Vue.prototype.$util.send(
      "plugin/getInstalledPlugins"
    );

    for (const plugin of plugins) {
      this.injectors.push(new WebPluginInjector(plugin));
    }

    // For debugging
    globalThis.webPluginInjectorManager = this;

    await this.injectPlugins();

    this.initialized = true;
  }

  private async injectPlugins() {
    for (const injector of this.injectors) {
      try {
        const pluginInstance = await injector.construct();
        await injector.injectStyle();
        pluginInstance.onLoad();
        this.pluginInstances[injector.manifest.id] = pluginInstance;
      } catch (err) {
        log.error(err);
      }
    }
  }

  async reinjectPlugin(id: Manifest["id"], type: "script" | "style") {
    const injector = this.injectors.find(
      (injector) => injector.manifest.id === id
    );

    if (!injector) {
      throw new Error(`Plugin ${id} not found`);
    }

    if (type === "script") {
      this.pluginInstances[id].onDestroy();
      this.pluginInstances[id] = await injector.construct();
      this.pluginInstances[id].onLoad();
    } else if (type === "style") {
      await injector.removeStyle().catch((err) => log.error(err));
      await injector.injectStyle();
    }
  }
}
