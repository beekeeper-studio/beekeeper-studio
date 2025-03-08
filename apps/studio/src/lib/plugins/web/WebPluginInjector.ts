import rawLog from "@bksLogger";
import Plugin from "../Plugin";
import { Manifest } from "../types";

const log = rawLog.scope("WebPluginInjector");

export default class WebPluginInjector {
  styleEl: HTMLStyleElement | null;

  constructor(readonly manifest: Manifest) { }

  async construct(): Promise<Plugin> {
    const imported = await import(
      `plugin://${this.manifest.id}/index.js?t=${Date.now()}`
    );

    if (!imported.default) {
      throw new Error(`Plugin ${this.manifest.id} has no default export.`);
    }

    const PluginClass: typeof Plugin = imported.default;

    const plugin = new PluginClass();

    Object.assign(plugin, {
      readFile: async (path: string) => {
        return await window.main.readPluginAsset(this.manifest.id, path);
      },
    });

    return plugin;
  }

  injectStyle(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const el = document.createElement("link");
      let settled = false;

      el.setAttribute("rel", "stylesheet");
      el.setAttribute(
        "href",
        `plugin://${this.manifest.id}/style.css?t=${Date.now()}`
      );
      el.onload = () => {
        log.info("loaded plugin's style", this.manifest.id);
        settled = true;
        resolve();
      };
      el.onerror = (...args) => {
        log.error("error loading plugin's style", this.manifest.id, ...args);
        settled = true;
        reject(args);
      };

      document.head.appendChild(el);

      this.styleEl = el;

      setTimeout(() => {
        if (!settled) {
          reject(
            new Error(
              `Plugin ${this.manifest.id} style injection timed out. The style element did not respond at the expected time.`
            )
          );
        }
      }, 3000);
    });
  }

  async removeStyle() {
    this.styleEl?.remove();
    this.styleEl = null;
  }
}
