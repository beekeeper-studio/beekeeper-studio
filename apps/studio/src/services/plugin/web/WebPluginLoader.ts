import {
  Manifest,
  OnViewRequestListener,
} from "../types";
import {
  PluginNotificationData,
  PluginResponseData,
  PluginRequestData,
} from "@beekeeperstudio/plugin";
import PluginStoreService from "./PluginStoreService";
import rawLog from "@bksLogger";
import _ from "lodash";
import type { UtilityConnection } from "@/lib/utility/UtilityConnection";

function joinUrlPath(a: string, b: string): string {
  return `${a.replace(/\/+$/, "")}/${b.replace(/^\/+/, "")}`;
}

const windowEventMap = new Map();
windowEventMap.set("MouseEvent", MouseEvent);
windowEventMap.set("PointerEvent", PointerEvent);
windowEventMap.set("KeyboardEvent", KeyboardEvent);
windowEventMap.set("Event", Event);

export default class WebPluginLoader {
  private iframes: HTMLIFrameElement[] = [];
  private listeners: OnViewRequestListener[] = [];
  private log: ReturnType<typeof rawLog.scope>;


  constructor(
    public readonly manifest: Manifest,
    private pluginStore: PluginStoreService,
    private utilityConnection: UtilityConnection
  ) {
    this.handleMessage = this.handleMessage.bind(this);
    this.log = rawLog.scope(`WebPluginLoader:${manifest.id}`);
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

    this.manifest.capabilities.views?.sidebars?.forEach((sidebar) => {
      this.pluginStore.addSidebarTab({
        id: sidebar.id,
        label: sidebar.name,
        url: `plugin://${this.manifest.id}/${this.getEntry(sidebar.entry)}`,
      });
    });

    this.manifest.capabilities.views?.tabTypes?.forEach((tabType) => {
      this.pluginStore.addTabTypeConfig({
        pluginId: this.manifest.id,
        pluginTabTypeId: tabType.id,
        name: tabType.name,
        kind: tabType.kind,
        icon: this.manifest.icon,
      });
    });
  }

  private handleMessage(event: MessageEvent) {
    const source = this.iframes.find(
      (iframe) => iframe.contentWindow === event.source
    );

    // Check if the message is from our iframe
    if (source) {
      if (event.data.id) {
        this.handleViewRequest(
          {
            id: event.data.id,
            name: event.data.name,
            args: event.data.args,
          },
          source
        );
      } else {
        this.handleViewNotification({
          name: event.data.name,
          args: event.data.args,
        });
      }
    }
  }

  private async handleViewRequest(
    request: PluginRequestData,
    source: HTMLIFrameElement
  ) {
    const afterCallbacks: ((response: PluginResponseData) => void)[] = [];
    const modifyResultCallbacks: ((result: PluginResponseData['result']) => PluginResponseData['result'] | Promise<PluginResponseData['result']>)[] = [];

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

    const response: PluginResponseData = {
      id: request.id,
      result: undefined,
    };

    try {
      this.checkPermission(request);

      switch (request.name) {
        // ========= READ ACTIONS ===========
        case "getTables":
          response.result = this.pluginStore.getTables();
          break;
        case "getColumns":
          response.result = await this.pluginStore.getColumns(
            request.args.table
          );
          break;
        case "getConnectionInfo":
          response.result = this.pluginStore.getConnectionInfo();
          break;
        case "getActiveTab":
          response.result = this.pluginStore.getActiveTab();
          break;
        case "getAllTabs":
          response.result = this.pluginStore.getAllTabs();
          break;
        case "getData":
        case "getEncryptedData": {
          const value = await this.utilityConnection.send(
            request.name === "getEncryptedData"
              ? "plugin/getEncryptedData"
              : "plugin/getData",
            { manifest: this.manifest, key: request.args.key }
          );
          response.result = value;
          break;
        }
        case "clipboard.readText":
          response.result = window.main.readTextFromClipboard()
          break;

        // ======== WRITE ACTIONS ===========
        case "runQuery":
          response.result = await this.pluginStore.runQuery(request.args.query);
          break;
        case "setData":
        case "setEncryptedData": {
          await this.utilityConnection.send(
            request.name === "setEncryptedData"
              ? "plugin/setEncryptedData"
              : "plugin/setData",
            { manifest: this.manifest, key: request.args.key, value: request.args.value }
          )
          break;
        }
        case "clipboard.writeText":
          window.main.writeTextToClipboard(request.args.text)
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
        case "openExternal":
          // FIXME maybe we should ask user permission first before opening?
          window.main.openExternally(request.args.link);
          break;
        case "openTab":
          this.pluginStore.openTab(request.args);
          break;

        default:
          throw new Error(`Unknown request: ${request.name}`);
      }

      for (const callback of modifyResultCallbacks) {
        response.result = await callback(response.result);
      }
    } catch (e) {
      response.error = e;
    }

    this.postMessage(response);

    afterCallbacks.forEach((callback) => {
      callback(response);
    });
  }

  private async handleViewNotification(notification: PluginNotificationData) {
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

      default:
        this.log.warn(`Unknown notification: ${notification.name}`);
    }
  }

  registerIframe(iframe: HTMLIFrameElement) {
    this.iframes.push(iframe);
    iframe.onload = () => {
      this.postMessage({
        name: "themeChanged",
        args: this.pluginStore.getTheme(),
      });
    };
  }

  unregisterIframe(iframe: HTMLIFrameElement) {
    this.iframes = _.without(this.iframes, iframe);
  }

  postMessage(data: PluginNotificationData | PluginResponseData) {
    if (!this.iframes) {
      this.log.warn("Cannot post message, iframe not registered.");
      return;
    }
    this.iframes.forEach((iframe) => {
      iframe.contentWindow.postMessage(data, "*");
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

    this.manifest.capabilities.views?.sidebars?.forEach((sidebar) => {
      this.pluginStore.removeSidebarTab(sidebar.id);
    });

    this.manifest.capabilities.views?.tabTypes?.forEach((tab) => {
      this.pluginStore.removeTabTypeConfig({
        pluginId: this.manifest.id,
        pluginTabTypeId: tab.id,
      });
    });
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
}
