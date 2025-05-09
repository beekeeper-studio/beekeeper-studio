import type { UtilityConnection } from "@/lib/utility/UtilityConnection";
import {
  Manifest,
  PluginNotificationData,
  PluginResponseData,
  PluginRequestData,
} from "../types";
import PluginStoreService from "./PluginStoreService";
import rawLog from "@bksLogger";
import {
  GetActiveTabResponse,
  GetColumnsResponse,
  GetConnectionInfoResponse,
  GetTablesResponse,
  GetThemeResponse,
  ThemePalette,
} from "../commTypes";
import _ from "lodash";

function joinUrlPath(a: string, b: string): string {
  return `${a.replace(/\/+$/, "")}/${b.replace(/^\/+/, "")}`;
}

const log = rawLog.scope("WebPluginManager");

export default class WebPluginLoader {
  private iframe?: HTMLIFrameElement;

  constructor(
    public readonly manifest: Manifest,
    private utilityConnection: UtilityConnection,
    private pluginStore: PluginStoreService
  ) {
    this.handleMessage = this.handleMessage.bind(this);
  }

  /** Starts the plugin */
  async load() {
    // Add event listener for messages from iframe
    window.addEventListener("message", this.handleMessage);

    this.manifest.capabilities.views?.sidebars.forEach((sidebar) => {
      this.pluginStore.addSidebarTab({
        ...sidebar,
        entry: this.getEntry(sidebar.entry),
      });
    });
  }

  private handleMessage(event: MessageEvent<PluginRequestData>) {
    if (!this.iframe) return;

    // Check if the message is from our iframe
    if (event.source === this.iframe.contentWindow) {
      this.handleIframeRequest(event.data);
    }
  }

  private async handleIframeRequest(request: PluginRequestData) {
    this.checkPermission(request);

    const response: PluginResponseData = {
      id: request.id,
      result: {},
    };

    try {
      switch (request.name) {
        // Read actions
        case "getTables":
          response.result = this.pluginStore.getTables() as GetTablesResponse;
          break;
        case "getColumns":
          response.result = (await this.pluginStore.getColumns(
            request.args.table
          )) as GetColumnsResponse;
          break;
        case "getConnectionInfo":
          response.result =
            this.pluginStore.getConnectionInfo() as GetConnectionInfoResponse;
          break;
        case "getActiveTab":
          response.result =
            this.pluginStore.getActiveTab() as GetActiveTabResponse;
          break;
        case "getTheme":
          const styles = window.getComputedStyle(document.body);
          const palette: ThemePalette = {
            themeBg: styles.getPropertyValue("--theme-bg"),
            themeBase: styles.getPropertyValue("--theme-base"),
            themePrimary: styles.getPropertyValue("--theme-primary"),
            themeSecondary: styles.getPropertyValue("--theme-secondary"),

            textDark: styles.getPropertyValue("--text-dark"),
            text: styles.getPropertyValue("--text"),
            textLight: styles.getPropertyValue("--text-light"),
            textLighter: styles.getPropertyValue("--text-lighter"),
            textHint: styles.getPropertyValue("--text-hint"),
            textDisabled: styles.getPropertyValue("--text-disabled"),

            brandInfo: styles.getPropertyValue("--brand-info"),
            brandSuccess: styles.getPropertyValue("--brand-success"),
            brandWarning: styles.getPropertyValue("--brand-warning"),
            brandDanger: styles.getPropertyValue("--brand-danger"),
            brandDefault: styles.getPropertyValue("--brand-default"),
            brandPurple: styles.getPropertyValue("--brand-purple"),
            brandPink: styles.getPropertyValue("--brand-pink"),

            borderColor: styles.getPropertyValue("--border-color"),
            linkColor: styles.getPropertyValue("--link-color"),
            placeholder: styles.getPropertyValue("--placeholder"),
            selection: styles.getPropertyValue("--selection"),
            inputHighlight: styles.getPropertyValue("--input-highlight"),
          };
          const cssString = Object.keys(palette)
            .map((key) => `--${_.kebabCase(key)}: ${palette[key]};`)
            .join("");
          response.result = {
            type: this.pluginStore.getThemeType(),
            palette,
            cssString,
          } as GetThemeResponse;
          break;

        // Write actions
        case "updateQueryText":
          this.pluginStore.updateQueryText(
            request.args.tabId,
            request.args.query
          );
          break;

        default:
          throw new Error(`Unknown request: ${request.name}`);
      }
    } catch (e) {
      response.error = e;
    }

    this.iframe.contentWindow.postMessage(response, "*");
  }

  async registerIframe(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
  }

  postMessage(data: PluginNotificationData | PluginResponseData) {
    if (!this.iframe) {
      log.warn("Cannot post message, iframe not registered.");
      return;
    }
    this.iframe.contentWindow.postMessage(data, "*");
  }

  getEntry(entry: string) {
    if (!this.manifest.pluginEntryDir) {
      return entry;
    }
    return joinUrlPath(this.manifest.pluginEntryDir, entry);
  }

  async unload() {
    window.removeEventListener("message", this.handleMessage);

    this.manifest.capabilities.views?.sidebars.forEach((sidebar) => {
      this.pluginStore.removeSidebarTab(sidebar.id);
    });
  }

  checkPermission(data: PluginRequestData) {
    // do nothing on purpose
    // if not permitted, throw error
  }
}
