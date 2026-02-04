import { JsonValue } from "@/types";
import { WebPluginContext } from "../types";

export class WebPluginCommandExecutor {
  constructor(private readonly context: WebPluginContext) { }

  execute(command: string, params?: JsonValue) {
    const menuItem = this.context.manifest.capabilities.menu.find((item) => {
      return item.command === command;
    });
    if (!menuItem) {
      throw new Error(`Command ${command} not found`);
    }
    this.context.store.createPluginTab({
      viewId: menuItem.view,
      manifest: this.context.manifest,
      command: command,
      params,
    });
  }
}
