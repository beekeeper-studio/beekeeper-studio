import {
  Manifest,
  PluginNotificationData,
  PluginResponseData,
  PluginRequestData,
  OnViewRequestListener,
} from "../types";
import PluginStoreService from "./PluginStoreService";
import rawLog from "@bksLogger";
import _ from "lodash";

function joinUrlPath(a: string, b: string): string {
  return `${a.replace(/\/+$/, "")}/${b.replace(/^\/+/, "")}`;
}

const log = rawLog.scope("WebPluginManager");

export default class WebPluginLoader {
  private iframes: HTMLIFrameElement[] = [];
  private listeners: OnViewRequestListener[] = [];

  constructor(
    public readonly manifest: Manifest,
    private pluginStore: PluginStoreService
  ) {
    this.handleMessage = this.handleMessage.bind(this);
  }

  /** Starts the plugin */
  async load(manifest?: Manifest) {
    if (manifest) {
      // @ts-ignore
      this.manifest = manifest;
    }

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
      });
    });
  }

  private handleMessage(event: MessageEvent) {
    const foundIframe = this.iframes.find(
      (iframe) => iframe.contentWindow === event.source
    )

    // Check if the message is from our iframe
    if (foundIframe) {
      this.handleViewRequest({
        id: event.data.id,
        name: event.data.name,
        args: event.data.args[0],
      });
    }
  }

  private async handleViewRequest(request: PluginRequestData) {
    const afterCallbacks: ((response: PluginResponseData) => void)[] = [];

    for (const listener of this.listeners) {
      await listener({
        request,
        after: (callback) => {
          afterCallbacks.push(callback);
        },
      })
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

        // ======== WRITE ACTIONS ===========
        case "runQuery":
          response.result = await this.pluginStore.runQuery(request.args.query);
          break;

        // ======== UI ACTIONS ===========
        case "expandTableResult":
          // Directly handled by the view component
          break;

        default:
          throw new Error(`Unknown request: ${request.name}`);
      }
    } catch (e) {
      response.error = e;
    }

    this.postMessage(response);

    afterCallbacks.forEach((callback) => {
      callback(response);
    });
  }

  registerIframe(iframe: HTMLIFrameElement) {
    this.iframes.push(iframe);
    this.postMessage({
      name: "themeChanged",
      args: this.pluginStore.getTheme(),
    })
  }

  unregisterIframe(iframe: HTMLIFrameElement) {
    this.iframes = _.without(this.iframes, iframe);
  }

  postMessage(data: PluginNotificationData | PluginResponseData) {
    if (!this.iframes) {
      log.warn("Cannot post message, iframe not registered.");
      return;
    }
    this.iframes.forEach((iframe) => {
      iframe.contentWindow.postMessage(data, "*");
    })
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
    }
  }

  checkPermission(data: PluginRequestData) {
    // do nothing on purpose
    // if not permitted, throw error
  }
}
