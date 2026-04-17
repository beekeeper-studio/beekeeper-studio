import { ContextOption } from "@/plugins/BeekeeperPlugin";
import {
  PluginMenuItem,
  PluginMenuItemPlacement,
  PluginView,
  WebPluginContext,
} from "@/services/plugin/types";
import _ from "lodash";
import pluginMenuFactories from "./PluginMenuFactories";

type MenuHandler = {
  add: () => void;
  remove: () => void;
};

export type MenuFactory = {
  create: (context: WebPluginContext, menuItem: PluginMenuItem) => MenuHandler;
};

export type MenuFactories = {
  [Placement in PluginMenuItemPlacement]: MenuFactory;
};

export class PluginMenuManager {
  constructor(private readonly context: WebPluginContext) { }

  private contextMenus = {
    tabHeader: [] as ContextOption[],
  };

  public getContextMenu(contextMenuId: string): ContextOption[] {
    return this.contextMenus[contextMenuId];
  }

  public register(views: PluginView[], menu: PluginMenuItem[]) {
    this.applyMenuItems("add", views, menu);
  }

  public unregister(views: PluginView[], menu: PluginMenuItem[]) {
    this.applyMenuItems("remove", views, menu);
  }

  private applyMenuItems(
    handlerType: keyof MenuHandler,
    views: PluginView[],
    menu: PluginMenuItem[]
  ) {
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
        const factory = pluginMenuFactories[placement];
        if (!factory) {
          this.context.log.error(
            new Error(`Unsupported placement: ${placement}`)
          );
          return;
        }
        const handler = factory.create(this.context, menuItem);
        handler[handlerType]();
      });
    });
  }
}
