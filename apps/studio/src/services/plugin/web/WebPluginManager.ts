import type { UtilityConnection } from "@/lib/utility/UtilityConnection";
import rawLog from "@bksLogger";
import { Manifest, OnViewRequestListener, PluginContext } from "../types";
import PluginStoreService from "./PluginStoreService";
import WebPluginLoader from "./WebPluginLoader";
import { ContextOption } from "@/plugins/BeekeeperPlugin";
import { PluginNotificationData, PluginViewContext } from "@beekeeperstudio/plugin";
import { FileHelpers } from "@/types";
import type Noty from "noty";
import { WebPluginCommandExecutor } from "./WebPluginCommandExecutor";
import { convertToManifestV1, mapViewsAndMenuFromV0ToV1 } from "../utils";

const log = rawLog.scope("WebPluginManager");

export type WebPluginManagerParams = {
  utilityConnection: UtilityConnection;
  pluginStore: PluginStoreService;
  appVersion: string;
  fileHelpers: FileHelpers;
  noty: {
    success(text: string): Noty;
    error(text: string): Noty;
    warning(text: string): Noty;
    info(text: string): Noty;
  };
  confirm(title?: string, message?: string, options?: { confirmLabel?: string, cancelLabel?: string }): Promise<boolean>;
}

/**
 * This is the root of all the plugin stuff in the frontend, and you probably
 * want to use this most of the time, especially if you want to communicate with
 * the plugins.
 *
 * (For backend stuff, please look at `PluginManager`)
 *
 * An instance of this class should be available as `$plugin` in Vue components, for example:
 *
 * ```ts
 * await this.$plugin.install('bks-ai-shell');
 * ```
 *
 * It needs to be initialized first, which should be done already.
 *
 * You can `install`, `uninstall` and `update` plugins.
 *
 * You can also communicate with the plugins by using the `notify`, `notifyAll`,
 * and `onViewRequest`. (Don't forget to register the iframe first! Use
 * `registerIframe` and `unregisterIframe`)
 *
 * For more info about a plugin, use `pluginOf`.
 */
export default class WebPluginManager {
  plugins: PluginContext[] = [];
  /** A map of plugin id -> loader */
  loaders: Map<string, WebPluginLoader> = new Map();

  private initialized = false;
  private utilityConnection: UtilityConnection;
  public readonly pluginStore: PluginStoreService;
  public readonly appVersion: string;
  public readonly fileHelpers: FileHelpers;
  private readonly noty: WebPluginManagerParams['noty'];
  private readonly confirm: WebPluginManagerParams['confirm'];

  constructor(params: WebPluginManagerParams) {
    this.utilityConnection = params.utilityConnection;
    this.pluginStore = params.pluginStore;
    this.appVersion = params.appVersion;
    this.fileHelpers = params.fileHelpers;
    this.noty = params.noty;
    this.confirm = params.confirm;
  }

  async initialize() {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    await this.utilityConnection.send("plugin/waitForInit");

    this.plugins = await this.utilityConnection.send(
      "plugin/plugins"
    );

    for (const { loadable, manifest } of this.plugins) {
      if (!loadable) {
        log.warn(`Plugin "${manifest.id}" is not loadable. Skipping...`);
        continue;
      }
      if (window.bksConfig.plugins[manifest.id]?.disabled) {
        log.info(`Plugin "${manifest.id}" is disabled. Skipping...`);
        continue;
      }
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

  /** Install a plugin by its id */
  async install(id: string) {
    const manifest = await this.utilityConnection.send("plugin/install", {
      id,
    });
    await this.loadPlugin(manifest);
    this.plugins.push({ manifest, loadable: true });
    return manifest;
  }

  /** Update a plugin by its id */
  async update(id: string) {
    const manifest = await this.utilityConnection.send("plugin/update", {
      id,
    });
    await this.reloadPlugin(id);
    return manifest;
  }

  /** Uninstall a plugin by its id */
  async uninstall(id: string) {
    await this.utilityConnection.send("plugin/uninstall", { id });
    await this.unloadPlugin(id);
    this.plugins = this.plugins.filter((p) => p.manifest.id !== id);
  }

  private async reloadPlugin(id: string, manifest?: Manifest) {
    const loader = this.loaders.get(id);
    if (!loader) {
      throw new Error("Plugin not found: " + id);
    }
    await loader.unload();
    await loader.load(manifest);
  }

  /** For plugins that use iframes, they need to be registered for communication.
   * Please call this BEFORE the iframe is loaded. Don't forget to unregister
   * it with `unregisterIframe` when not used.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/load_event} */
  registerIframe(pluginId: string, iframe: HTMLIFrameElement, context: PluginViewContext) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    loader.registerViewInstance({ iframe, context });
  }

  unregisterIframe(pluginId: string, iframe: HTMLIFrameElement) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    loader.unregisterViewInstance(iframe);
  }

  /** Send a notification to a specific plugin */
  async notify(pluginId: string, data: PluginNotificationData) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    loader.broadcast(data);
  }

  /** Send a notification to all plugins */
  async notifyAll(data: PluginNotificationData) {
    this.loaders.forEach((loader) => {
      loader.broadcast(data);
    })
  }

  /** Get more info about a specific plugin */
  pluginOf(pluginId: string) {
    const plugin = this.plugins.find((p) => p.manifest.id === pluginId);
    if (!plugin) {
      throw new Error("Plugin not found: " + pluginId);
    }
    return plugin;
  }

  buildUrlFor(pluginId: string, viewId: string) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    // TODO (azmi): later, we don't need to convert the manifest when plugin snapshot is added
    const view = convertToManifestV1(loader.manifest).capabilities.views.find(
      (v) => v.id === viewId
    );
    if (!view) {
      throw new Error(`View not found: ${viewId} in plugin ${pluginId}`);
    }
    return loader.buildEntryUrl(view.entry);
  }

  async viewEntrypointExists(pluginId: string, viewId: string): Promise<boolean> {
    return await this.utilityConnection.send("plugin/viewEntrypointExists", {
      pluginId,
      viewId,
    });
  }

  /**
   * Subscribe to view requests from a specific plugin. Inspired by Pinia's `$onAction`.
   *
   * @example
   * ```ts
   * this.$plugin.onViewRequest("bks-ai-shell", async (params) => {
   *   const { request, after } = params;
   *
   *   if (request.name === "setTabTitle") {
   *     after(() => {
   *       log.warn("The AI has set the tab title, wee woo, robot alert");
   *     });
   *   }
   * });
   * */
  onViewRequest(pluginId: string, listener: OnViewRequestListener) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error("Plugin not found: " + pluginId);
    }
    return loader.addListener(listener);
  }

  resolveContextMenuOptions(
    contextId: "tab-header",
    options: ContextOption[]
  ) {
    const extraOptions = [];

    this.loaders.forEach((loader) => {
      extraOptions.push(...loader.menu.getContextMenu(contextId));
    });

    if (extraOptions.length === 0) {
      return options;
    }

    return [
      ...options,
      { type: "divider" },
      ...extraOptions,
    ]
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

  execute(pluginId: string, command: string) {
    const loader = this.loaders.get(pluginId);
    if (!loader) {
      throw new Error(
        `Attempting to execute a command on a plugin that is not loaded. (pluginId: ${pluginId})`
      );
    }
    const executor = new WebPluginCommandExecutor(loader.context);
    executor.execute(command);
  }


  private async loadPlugin(manifest: Manifest) {
    if (this.loaders.has(manifest.id)) {
      log.warn(`Plugin "${manifest.id}" already loaded. Skipping...`);
      return this.loaders.get(manifest.id);
    }

    const loader = new WebPluginLoader({
      manifest,
      store: this.pluginStore,
      utility: this.utilityConnection,
      log: rawLog.scope(`Plugin:${manifest.id}`),
      appVersion: this.appVersion,
      fileHelpers: this.fileHelpers,
      noty: this.noty,
      confirm: this.confirm,
    });
    await loader.load();
    this.loaders.set(manifest.id, loader);
    return loader;
  }

  private async unloadPlugin(id: string) {
    const loader = this.loaders.get(id);
    if (!loader) {
      throw new Error("Plugin not found: " + id);
    }
    await loader.unload();
    loader.dispose();
    this.loaders.delete(id);
  }
}
