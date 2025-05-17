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

  private handleMessage(event: MessageEvent) {
    if (!this.iframe) return;

    // Check if the message is from our iframe
    if (event.source === this.iframe.contentWindow) {
      this.handleIframeRequest({
        id: event.data.id,
        name: event.data.name,
        args: event.data.args[0],
      });
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
          const cssProps = [
            "--theme-bg",
            "--theme-base",
            "--theme-primary",
            "--theme-secondary",

            "--text-dark",
            "--text",
            "--text-light",
            "--text-lighter",
            "--text-hint",
            "--text-disabled",

            "--brand-info",
            "--brand-success",
            "--brand-warning",
            "--brand-danger",
            "--brand-default",
            "--brand-purple",
            "--brand-pink",

            "--border-color",
            "--link-color",
            "--placeholder",
            "--selection",
            "--input-highlight",

            // BksTextEditor
            "--bks-text-editor-activeline-bg-color",
            "--bks-text-editor-activeline-gutter-bg-color",
            "--bks-text-editor-atom-fg-color",
            "--bks-text-editor-bg-color",
            "--bks-text-editor-bracket-fg-color",
            "--bks-text-editor-builtin-fg-color",
            "--bks-text-editor-comment-attribute-fg-color",
            "--bks-text-editor-comment-def-fg-color",
            "--bks-text-editor-comment-fg-color",
            "--bks-text-editor-comment-tag-fg-color",
            "--bks-text-editor-comment-type-fg-color",
            "--bks-text-editor-cursor-bg-color",
            "--bks-text-editor-def-fg-color",
            "--bks-text-editor-error-bg-color",
            "--bks-text-editor-error-fg-color",
            "--bks-text-editor-fg-color",
            "--bks-text-editor-gutter-bg-color",
            "--bks-text-editor-guttermarker-fg-color",
            "--bks-text-editor-guttermarker-subtle-fg-color",
            "--bks-text-editor-header-fg-color",
            "--bks-text-editor-keyword-fg-color",
            "--bks-text-editor-linenumber-fg-color",
            "--bks-text-editor-link-fg-color",
            "--bks-text-editor-matchingbracket-fg-color",
            "--bks-text-editor-matchingbracket-bg-color",
            "--bks-text-editor-number-fg-color",
            "--bks-text-editor-property-fg-color",
            "--bks-text-editor-selected-bg-color",
            "--bks-text-editor-string-fg-color",
            "--bks-text-editor-tag-fg-color",
            "--bks-text-editor-variable-2-fg-color",
            "--bks-text-editor-variable-3-fg-color",
            "--bks-text-editor-variable-fg-color",
            "--bks-text-editor-namespace-fg-color",
            "--bks-text-editor-type-fg-color",
            "--bks-text-editor-class-fg-color",
            "--bks-text-editor-enum-fg-color",
            "--bks-text-editor-interface-fg-color",
            "--bks-text-editor-struct-fg-color",
            "--bks-text-editor-typeParameter-fg-color",
            "--bks-text-editor-parameter-fg-color",
            "--bks-text-editor-enumMember-fg-color",
            "--bks-text-editor-decorator-fg-color",
            "--bks-text-editor-event-fg-color",
            "--bks-text-editor-function-fg-color",
            "--bks-text-editor-method-fg-color",
            "--bks-text-editor-macro-fg-color",
            "--bks-text-editor-label-fg-color",
            "--bks-text-editor-regexp-fg-color",
            "--bks-text-editor-operator-fg-color",
            "--bks-text-editor-definition-fg-color",
            "--bks-text-editor-variableName-fg-color",
            "--bks-text-editor-bool-fg-color",
            "--bks-text-editor-null-fg-color",
            "--bks-text-editor-className-fg-color",
            "--bks-text-editor-propertyName-fg-color",
            "--bks-text-editor-punctuation-fg-color",
            "--bks-text-editor-meta-fg-color",
            "--bks-text-editor-typeName-fg-color",
            "--bks-text-editor-labelName-fg-color",
            "--bks-text-editor-attributeName-fg-color",
            "--bks-text-editor-attributeValue-fg-color",
            "--bks-text-editor-heading-fg-color",
            "--bks-text-editor-url-fg-color",
            "--bks-text-editor-processingInstruction-fg-color",
            "--bks-text-editor-special-string-fg-color",

            // BksTextEditor context menu
            "--bks-text-editor-context-menu-bg-color",
            "--bks-text-editor-context-menu-fg-color",
            "--bks-text-editor-context-menu-item-bg-color-active",
            "--bks-text-editor-context-menu-item-fg-color-active",
            "--bks-text-editor-context-menu-item-bg-color-hover",
          ];

          const styles = getComputedStyle(document.body);
          /** Key = css property, value = css value */
          const palette: Record<string, string> = {};

          for (const name of cssProps) {
            const camelKey = _.camelCase(name);
            palette[camelKey] = styles.getPropertyValue(name).trim();
          }

          const cssString = cssProps
            .map((cssProp) => `${cssProp}: ${palette[_.camelCase(cssProp)]};`)
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
