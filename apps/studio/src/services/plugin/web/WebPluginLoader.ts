import {
  AfterViewRequestCallback,
  Manifest,
  OnViewRequestListener,
  ViewResultModifier,
  WebPluginContext,
  WebPluginViewInstance,
} from "../types";
import type {
  RequestMap,
  RequestPayload,
  ResponsePayload,
  NotificationMap,
} from "@beekeeperstudio/plugin/dist/internal";
import PluginStoreService from "./PluginStoreService";
import rawLog from "@bksLogger";
import _ from "lodash";
import type { UtilityConnection } from "@/lib/utility/UtilityConnection";
import { PluginMenuManager } from "./PluginMenuManager";
import { isManifestV0, mapViewsAndMenuFromV0ToV1 } from "../utils";
import { PrimaryKeyColumn } from "@/lib/db/models";

// Discriminated union for request+result that TypeScript can narrow by name
type PluginResponseData = {
  [K in keyof RequestMap]: {
    id: string;
    name: K;
    args: RequestMap[K]["args"];
    result: RequestMap[K]["return"];
    error?: unknown;
  };
}[keyof RequestMap];

type PluginNotificationData = {
  [K in keyof NotificationMap]: {
    name: K;
    args: NotificationMap[K]["args"];
  };
}[keyof NotificationMap];

function joinUrlPath(a: string, b: string): string {
  return `${a.replace(/\/+$/, "")}/${b.replace(/^\/+/, "")}`;
}

const windowEventMap = new Map();
windowEventMap.set("MouseEvent", MouseEvent);
windowEventMap.set("PointerEvent", PointerEvent);
windowEventMap.set("KeyboardEvent", KeyboardEvent);
windowEventMap.set("Event", Event);

export default class WebPluginLoader {
  private viewInstances: WebPluginViewInstance[] = [];
  private onReadyListeners: Function[] = [];
  private onDisposeListeners: Function[] = [];
  private listeners: OnViewRequestListener[] = [];

  /** @deprecated use `context.log` instead */
  private log: ReturnType<typeof rawLog.scope>;
  /** @deprecated use `context.manifest` instead */
  public readonly manifest: Manifest;
  /** @deprecated use `context.store` instead */
  private pluginStore: PluginStoreService;
  /** @deprecated use `context.utility` instead */
  private utilityConnection: UtilityConnection;
  private listening = false;

  menu: PluginMenuManager;

  constructor(public readonly context: WebPluginContext) {
    this.manifest = context.manifest;
    this.pluginStore = context.store;
    this.utilityConnection = context.utility;
    this.log = context.log;

    this.menu = new PluginMenuManager(context);

    this.handleMessage = this.handleMessage.bind(this);
    this.onTableChanged = this.onTableChanged.bind(this);
  }

  /** Starts the plugin */
  async load(manifest?: Manifest) {
    // FIXME dont load manifest this way. probably make a new method `setManifest`
    if (manifest) {
      // @ts-ignore
      this.manifest = manifest;
    }

    this.log.info("Loading plugin", this.manifest);

    // Add event listener for messages from iframe
    window.addEventListener("message", this.handleMessage);

    // Backward compatibility: Early version of AI Shell.
    const { views, menu } = isManifestV0(this.context.manifest)
      ? mapViewsAndMenuFromV0ToV1(this.context.manifest)
      : this.context.manifest.capabilities;

    this.pluginStore.addTabTypeConfigs(this.context.manifest, views);
    this.menu.register(views, menu);

    if (!this.listening) {
      this.registerEvents();
      this.onReadyListeners.forEach((fn) => fn());
    }
  }

  private handleMessage(event: MessageEvent) {
    const view = this.viewInstances.find(
      ({ iframe }) => iframe.contentWindow === event.source
    );
    const source = view?.iframe;

    // Check if the message is from our iframe
    if (source) {
      if (event.data.id !== undefined) {
        this.handleViewRequest(
          {
            id: event.data.id,
            name: event.data.name,
            args: event.data.args,
          },
          source
        );
      } else {
        this.handleViewNotification(source, {
          name: event.data.name,
          args: event.data.args,
        });
      }
    }
  }

  private async handleViewRequest(
    request: RequestPayload,
    source: HTMLIFrameElement
  ) {
    const afterCallbacks: AfterViewRequestCallback[] = [];
    const modifyResultCallbacks: ViewResultModifier[] = [];

    for (const listener of this.listeners) {
      await listener({
        source,
        request,
        after: (callback) => {
          afterCallbacks.push(callback);
        },
        modifyResult: (callback) => {
          modifyResultCallbacks.push(callback);
        },
      });
    }

    // Create `response` that TypeScript can narrow by name in switch
    const response: PluginResponseData = {
      id: request.id,
      name: request.name,
      args: request.args,
      result: undefined as any,
      error: undefined as any,
    };

    try {
      this.checkPermission(request);

      switch (response.name) {
        // ========= READ ACTIONS ===========
        case "getSchemas":
          response.result = await this.context.utility.send("conn/listSchemas");
          break;
        case "getTables":
          response.result = this.context.store.getTables(
            response.args.schema
          );
          break;
        case "getColumns":
          response.result = await this.context.store.getColumns(
            response.args.table,
            response.args.schema
          );
          break;
        case "getTableKeys":
        case "getOutgoingKeys":
          response.result = await this.context.utility.send(
            'conn/getOutgoingKeys',
            { table: response.args.table, schema: response.args.schema }
          );
          break;
        case "getIncomingKeys":
          response.result = await this.context.utility.send(
            'conn/getIncomingKeys',
            { table: response.args.table, schema: response.args.schema }
          );
          break;
        case "getTableIndexes":
          response.result = await this.context.utility
            .send("conn/listTableIndexes", {
              table: response.args.table,
              schema: response.args.schema,
            });
          break;
        case "getPrimaryKeys":
          response.result = await this.context.utility
            .send("conn/getPrimaryKeys", {
              table: response.args.table,
              schema: response.args.schema,
            })
            .then((keys: PrimaryKeyColumn[]) =>
              keys.map((key) => ({ ...key, name: key.columnName }))
            );
          break;
        case "getAppInfo":
          response.result = {
            theme: this.pluginStore.getTheme(),
            version: this.context.appVersion,
          };
          break;
        case "getViewContext":
          const view = this.viewInstances.find((ins) => ins.iframe === source);
          if (!view) {
            throw new Error("View context not found.");
          }
          response.result = view.context;
          break;
        case "getConnectionInfo":
          response.result = this.pluginStore.getConnectionInfo();
          break;
        case "getData":
        case "getEncryptedData": {
          const value = await this.utilityConnection.send(
            response.name === "getEncryptedData"
              ? "plugin/getEncryptedData"
              : "plugin/getData",
            { manifest: this.manifest, key: response.args.key }
          );
          response.result = value;
          break;
        }
        case "clipboard.readText":
          response.result = window.main.readTextFromClipboard();
          break;
        case "checkForUpdate":
          response.result = await this.context.utility.send("plugin/checkForUpdates", {
            id: this.context.manifest.id,
          });
          break;

        // ======== WRITE ACTIONS ===========
        case "runQuery":
          response.result = await this.pluginStore.runQuery(response.args.query);
          break;
        case "setData":
        case "setEncryptedData": {
          await this.utilityConnection.send(
            response.name === "setEncryptedData"
              ? "plugin/setEncryptedData"
              : "plugin/setData",
            { manifest: this.manifest, key: response.args.key, value: response.args.value }
          )
          break;
        }
        case "clipboard.writeText":
          window.main.writeTextToClipboard(response.args.text);
          break;
        case "clipboard.writeImage":
          response.result = window.main.writeImageToClipboard(response.args.data);
          break;
        case "noty.info":
          this.context.noty.info(response.args.message, {
            allowRawHtml: false,
          });
          break;
        case "noty.success":
          this.context.noty.success(response.args.message, {
            allowRawHtml: false,
          });
          break;
        case "noty.error":
          this.context.noty.error(response.args.message, {
            allowRawHtml: false,
          });
          break;
        case "noty.warning":
          this.context.noty.warning(response.args.message, {
            allowRawHtml: false,
          });
          break;
        case "confirm":
          response.result = await this.context.confirm(
            response.args.title,
            response.args.message,
            response.args.options
          );
          break;

        // ======== UI ACTIONS ===========
        case "expandTableResult":
          // Directly handled by the view components
          break;
        case "setTabTitle":
          // Directly handled by the view components
          break;
        case "getViewState":
          // Directly handled by the view components - If the plugin is a tab
          // plugin, each tab has its own state. To easily access/modify the
          // state while isolating it, we let each Tab component to intercept
          // the response by using `modifyResult`. And then the state can be
          // accessed via `this.tab.context.state`.
          break;
        case "setViewState":
          // Directly handled by the view components
          break;
        case "toggleStatusBarUI":
          // Directly handled by the view components - especially the tab views
          break;
        case "openExternal":
          // FIXME maybe we should ask user permission first before opening?
          window.main.openExternally(response.args.link);
          break;
        case "openTab":
          this.pluginStore.openTab(response.args);
          break;

        // ========= SYSTEM ACTIONS ===========
        case "requestFileSave":
          await this.context.fileHelpers.save({
            content: response.args.data,
            fileName: response.args.fileName,
            encoding: response.args.encoding,
            filters: response.args.filters,
          });
          break;

        default:
          throw new Error(`Unknown request: ${response.name}`);
      }

      for (const callback of modifyResultCallbacks) {
        response.result = await callback(response.result);
      }
    } catch (e) {
      response.error = e;
    }

    this.postMessage(source, response);

    afterCallbacks.forEach((callback) => {
      callback(response);
    });
  }

  private async handleViewNotification(
    source: HTMLIFrameElement,
    notification: PluginNotificationData
  ) {
    switch (notification.name) {
      case "windowEvent": {
        const windowEventClass = windowEventMap.get(
          notification.args.eventClass
        );

        if (!windowEventClass || typeof windowEventClass !== "function") {
          this.log.warn(
            `Invalid or unknown event class: ${notification.args.eventClass}`
          );
          return;
        }

        document.dispatchEvent(
          new windowEventClass(
            notification.args.eventType,
            notification.args.eventInitOptions
          )
        );

        break;
      }
      case "pluginError": {
        this.log.error(`Received plugin error: ${notification.args.message}`, notification.args);
        break;
      }
      case "broadcast": {
        this.viewInstances.forEach(({ iframe }) => {
          if (iframe === source) {
            return;
          }
          this.postMessage(iframe, {
            name: "broadcast",
            args: {
              message: notification.args.message,
            },
          });
        });
        break;
      }

      default:
        this.log.warn(`Unknown notification: ${notification.name}`);
    }
  }

  registerViewInstance(options: WebPluginViewInstance) {
    this.viewInstances.push(options);
  }

  unregisterViewInstance(iframe: HTMLIFrameElement) {
    this.viewInstances = this.viewInstances.filter((ins) => ins.iframe !== iframe);
  }

  postMessage(iframe: HTMLIFrameElement, data: PluginNotificationData | ResponsePayload) {
    iframe.contentWindow.postMessage(data, "*");
  }

  broadcast(data: PluginNotificationData) {
    this.viewInstances.forEach(({ iframe }) => {
      this.postMessage(iframe, data);
    });
  }

  buildEntryUrl(entry: string) {
    return `plugin://${this.manifest.id}/${this.getEntry(entry)}`;
  }

  getEntry(entry: string) {
    if (!this.manifest.pluginEntryDir) {
      return entry;
    }
    return joinUrlPath(this.manifest.pluginEntryDir, entry);
  }

  async unload() {
    window.removeEventListener("message", this.handleMessage);

    const { views, menu } = isManifestV0(this.context.manifest)
      ? mapViewsAndMenuFromV0ToV1(this.context.manifest)
      : this.context.manifest.capabilities;

    this.menu.unregister(views, menu);
    this.pluginStore.removeTabTypeConfigs(this.context.manifest, views);
  }

  addListener(listener: OnViewRequestListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = _.without(this.listeners, listener);
    };
  }

  checkPermission(data: PluginRequestData) {
    // do nothing on purpose
    // if not permitted, throw error
  }

  /** Warn: please dispose only when the plugin is not used anymore, like
   * after uninstalling. */
  dispose() {
    this.unregisterEvents();
    this.onDisposeListeners.forEach((fn) => fn());
  }

  /** Register all events here. */
  private registerEvents() {
    // Add event listener for messages from iframe
    this.context.store.on("tablesChanged", this.onTableChanged);
    window.addEventListener("message", this.handleMessage);
    this.listening = true;
  }

  /** Unregister all events here. */
  private unregisterEvents() {
    this.context.store.off("tablesChanged", this.onTableChanged);
    window.removeEventListener("message", this.handleMessage);
    this.listening = false;
  }

  /** Called when the plugin is ready to be used. If the plugin uses iframes,
   * this should be called before mounting the iframes. */
  onReady(fn: Function) {
    if (this.listening) {
      fn();
    }
    this.onReadyListeners.push(fn);
    return () => {
      this.onReadyListeners = _.without(this.onReadyListeners, fn);
    }
  }

  /** Called when the plugin is disposed. */
  onDispose(fn: Function) {
    this.onDisposeListeners.push(fn);
    return () => {
      this.onDisposeListeners = _.without(this.onDisposeListeners, fn);
    }
  }

  private onTableChanged() {
    this.broadcast({ name: "tablesChanged", args: void 0 });
  }
}
