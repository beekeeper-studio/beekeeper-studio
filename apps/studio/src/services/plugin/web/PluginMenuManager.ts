import { ContextOption } from "@/plugins/BeekeeperPlugin";
import {
  PluginMenuItem,
  WebPluginContext,
} from "@/services/plugin/types";
import _ from "lodash";
import { menuHandlers } from "./PluginMenuHandlers";

type MenuHandler = {
  add: (params: {
    context: WebPluginContext;
    menuItem: PluginMenuItem;
  }) => void;
  remove: (params: {
    context: WebPluginContext;
    menuItem: PluginMenuItem;
  }) => void;
};

export class PluginMenuManager {
  constructor(private readonly context: WebPluginContext) { }

  private contextMenus = {
    tabHeader: [] as ContextOption[],
  };

  public getContextMenu(contextMenuId: string): ContextOption[] {
    return this.contextMenus[contextMenuId];
  }

  public register() {
    this.applyMenuItems("add");
  }

  public unregister() {
    this.applyMenuItems("remove");
  }

  private applyMenuItems(type: keyof MenuHandler) {
    const menu = this.context.manifest.capabilities.menu || [];
    const views = this.context.manifest.capabilities.views || [];

    if (!menu || !views || !_.isArray(views)) {
      return;
    }

    if (_.isArray(views) && views.length === 0) {
      return;
    }

    menu.forEach((menuItem) => {
      const view = views.find((view) => view.id === menuItem.view);

      if (!view) {
        this.context.log.error(new Error(`Unknown view: ${menuItem.view}`));
        return;
      }

      const placement = !_.isArray(menuItem.placement)
        ? [menuItem.placement]
        : menuItem.placement;

      placement.forEach((placement) => {
        const handler = menuHandlers[view.type]?.[placement];
        if (!handler) {
          this.context.log.error(
            new Error(`Unknown menu placement: ${placement}`)
          );
          return;
        }
        const id = `${this.context.manifest.id}-${menuItem.command}`;
        handler[type]({ id, context: this.context, menuItem });
      });
    });
  }
}
