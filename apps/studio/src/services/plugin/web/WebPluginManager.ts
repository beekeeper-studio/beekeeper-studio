import type { UtilityConnection } from "@/lib/utility/UtilityConnection";
import rawLog from "@bksLogger";
import { Manifest, OnViewRequestListener, PluginNotificationData } from "../types";
import PluginStoreService from "./PluginStoreService";
import WebPluginLoader from "./WebPluginLoader";

const log = rawLog.scope("WebPluginManager");

export default class WebPluginManager {
  /** A map of plugin id -> loader */
  loaders: Map<string, WebPluginLoader> = new Map();

  private initialized = false;

  constructor(
    private utilityConnection: UtilityConnection,
    public readonly pluginStore: PluginStoreService
  ) {}

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

  // TODO implement enable/disable plugins
  async getEnabledPlugins(): Promise<Manifest[]> {
    return [...this.loaders.values()].map((loader) => loader.manifest);
  }

  async install(id: string) {
    const manifest = await this.utilityConnection.send("plugin/install", {
      id,
    });
    await this.loadPlugin(manifest);
    return manifest;
  }

  async update(id: string) {
    const manifest = await this.utilityConnection.send("plugin/update", {
      id,
    });
    await this.reloadPlugin(id);
    return manifest;
  }

  async uninstall(id: string) {
    await this.utilityConnection.send("plugin/uninstall", { id });
    const loader = this.loaders.get(id);
    if (!loader) {
      throw new Error("Plugin not found: " + id);
    }
    await loader.unload();
    loader.dispose();
    this.loaders.delete(id);
  }

  async reloadPlugin(id: string, manifest?: Manifest) {
    const loader = this.loaders.get(id);
    if (!loader) {
      throw new Error("Plugin not found: " + id);
    }
    await loader.unload();
    await loader.load(manifest);
  }

  /** For plugins that use iframes, they need to be registered so that we can
   * communicate. Please call this BEFORE the iframe is loaded.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/load_event} */
  registerIframe(pluginId: string, iframe: HTMLIFrameElement) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    loader.registerIframe(iframe);
  }

  unregisterIframe(pluginId: string, iframe: HTMLIFrameElement) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    loader.unregisterIframe(iframe);
  }

  /** Send a notification to a specific plugin */
  async notify(pluginId: string, data: PluginNotificationData) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    loader.postMessage(data);
  }

  /** Send a notification to all plugins */
  async notifyAll(data: PluginNotificationData) {
    this.loaders.forEach((loader) => {
      loader.postMessage(data);
    })
  }

  manifestOf(pluginId: string) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    return loader.manifest;
  }

  buildUrlFor(pluginId: string, entry: string) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    return loader.buildEntryUrl(entry);
  }

  /** Subscribe to view requests from a specific plugin. Inspired by Pinia's `$onAction`. */
  onViewRequest(pluginId: string, listener: OnViewRequestListener) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    return loader.addListener(listener);
  }

  /** Subscribe to when a plugin is ready to be used. */
  onReady(pluginId: string, fn: Function) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    return loader.onReady(fn);
  }

  /** Subscribe to when a plugin is disposed. */
  onDispose(pluginId: string, fn: Function) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    return loader.onDispose(fn);
  }

  private async loadPlugin(manifest: Manifest) {
    if (this.loaders.has(manifest.id)) {
      log.warn(`Plugin "${manifest.id}" already loaded. Skipping...`);
      return this.loaders.get(manifest.id);
    }

    const loader = new WebPluginLoader(manifest, this.pluginStore, this.utilityConnection);
    await loader.load();
    this.loaders.set(manifest.id, loader);
    return loader;
  }
}
