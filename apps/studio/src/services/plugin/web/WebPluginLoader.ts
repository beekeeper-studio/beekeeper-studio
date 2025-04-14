import type { UtilityConnection } from "@/lib/utility/UtilityConnection";
import { Manifest } from "../types";
import PluginStoreService from "./PluginStoreService";

export default class WebPluginLoader {
  constructor(
    public readonly manifest: Manifest,
    private utilityConnection: UtilityConnection,
    private pluginStore: PluginStoreService
  ) { }

  /** Starts the plugin */
  async load() {
    this.manifest.capabilities.views?.sidebars.forEach((sidebar) => {
      this.pluginStore.addSidebarTab(sidebar);
    })
  }

  async unload() {
    this.manifest.capabilities.views?.sidebars.forEach((sidebar) => {
      this.pluginStore.removeSidebarTab(sidebar.id);
    })
  }
}
