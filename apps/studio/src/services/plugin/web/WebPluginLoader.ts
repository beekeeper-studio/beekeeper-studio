import rawLog from "@bksLogger";
import Vue from "vue";
import Plugin from "../Plugin";
import { Manifest } from "../types";

const log = rawLog.scope("WebPluginLoader");

export default class WebPluginLoader {
  private plugin: Plugin | null = null;
  private styleEl: HTMLLinkElement | null = null;

  constructor(readonly manifest: Manifest) { }

  async load() {
    this.styleEl = this.loadStyle();
    document.head.appendChild(this.styleEl);

    this.plugin = await this.loadScript();
    this.plugin.onLoad();
  }

  async unload() {
    await this.unloadScript();
    this.unloadStyle();
  }

  private async loadScript() {
    const imported = await import(
      `plugin://${this.manifest.id}/index.js?t=${Date.now()}`
    );

    if (!imported.default) {
      throw new Error(`Plugin ${this.manifest.id} has no default export.`);
    }

    const PluginClass: typeof Plugin = imported.default;

    const plugin = new PluginClass();

    Object.assign(plugin, {
      getAsset: async (path: string) => {
        return await Vue.prototype.$util.send("plugin/getAsset", {
          manifest: this.manifest,
          path,
        });
      },
    });

    return plugin;
  }

  private loadStyle() {
    const el = document.createElement("link");

    el.setAttribute("rel", "stylesheet");
    el.setAttribute(
      "href",
      `plugin://${this.manifest.id}/style.css?t=${Date.now()}`
    );
    el.onerror = (...args) => {
      log.error("error loading plugin's style", this.manifest.id, ...args);
    };

    return el;
  }

  private async unloadScript() {
    await this.plugin.onDestroy();
    this.plugin = null;
  }

  private unloadStyle() {
    this.styleEl.remove();
    this.styleEl = null;
  }
}
