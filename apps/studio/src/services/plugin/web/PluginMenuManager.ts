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
  keybindingHandler?: (event: KeyboardEvent) => void;
};

type MenuFactoryCreateOptions = {
  /**
   * The path to the key binding added in `config.ini` minus the
   * `"keybindings."`
   *
   * @example
   *
   * `"plugins.my-plugin.my-command"` ✓
   * `"keybindings.plugins.my-plugin.my-command"` ✗
   **/
  keyPath?: string;
};

export type MenuFactory = {
  create: (
    context: WebPluginContext,
    menuItem: PluginMenuItem,
    options: MenuFactoryCreateOptions
  ) => MenuHandler;
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
    action: "remove" | "add",
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

      /** See {@link MenuFactoryCreateOptions.keyPath} */
      const keyPath = `plugins.${this.context.manifest.id}.${menuItem.command}` as const;
      const hasKeybinding = window.bksConfig.has('keybindings.' + keyPath);

      placement.forEach((placement) => {
        const factory = pluginMenuFactories[placement];
        if (!factory) {
          this.context.log.error(
            new Error(`Unsupported placement: ${placement}`)
          );
          return;
        }
        const handler = factory.create(this.context, menuItem, {
          keyPath: hasKeybinding ? keyPath : undefined,
        });

        if (action === 'add') {
          handler.add();
          if (handler.keybindingHandler && hasKeybinding) {
            this.context.store.addKeybinding({
              alias: placement,
              path: keyPath,
              handler: handler.keybindingHandler,
            });
          }
          return;
        }

        if (action === 'remove') {
          handler.remove();
          if (handler.keybindingHandler && hasKeybinding) {
            this.context.store.removeKeybinding(
              placement,
              handler.keybindingHandler
            );
          }
          return;
        }

        throw new Error(`Unknown action: ${action}`);
      });
    });
  }
}
