import { TransportOpenTab } from "@/common/transport/TransportOpenTab";
import type { DatabaseEntity, TableOrView } from "@/lib/db/models";
import type { CellComponent, ColumnComponent } from "tabulator-tables";
import type { EntityMenuParams } from "@beekeeperstudio/plugin";
import { MenuFactories, MenuFactory } from "./PluginMenuManager";
import { buildParamsForStatusbar, buildParamsForTableMenu, editorParams } from "./MenuParams";
import { AppEvent } from "@/common/AppEvent";
import { PLUGIN_POPUP_MENUS, PluginPopupPlacement } from "@/lib/menu/pluginMenuItems";
import { getParsedKeybinding } from "../utils";
import { NativePluginMenuItem, WebPluginContext } from "../types";
import type { JsonValue } from "@/types";
import _ from "lodash";

type ParamsBuilder = (options: any, context: WebPluginContext) => unknown;

/** Toolbar buttons show their whole name, so a longer one crowds the toolbar. */
export const TOOLBAR_NAME_MAX_LENGTH = 20;

/**
 * A placement that adds an item to one of the app's popup menus. When the
 * item is picked, the plugin view opens in a new tab with the params built
 * from the menu's handler argument.
 */
function popupMenuFactory(
  placement: PluginPopupPlacement,
  buildParams: ParamsBuilder
): MenuFactory {
  const menuId = PLUGIN_POPUP_MENUS[placement];
  return {
    create(context, menuItem) {
      const slug = `${context.manifest.id}-${menuItem.command}`;
      if (placement === "editor.query.toolbar" && menuItem.name.length > TOOLBAR_NAME_MAX_LENGTH) {
        context.log.warn(
          `Toolbar button "${menuItem.name}" (${menuItem.command}) is longer than ${TOOLBAR_NAME_MAX_LENGTH} characters. The query editor toolbar shows the whole name, so keep it short.`
        );
      }
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            leadingIcon: menuItem.icon ?? context.manifest.icon ?? "extension",
            plugin: { id: context.manifest.id, name: context.manifest.name },
            enabledWhen: menuItem.enabledWhen,
            handler: (options: unknown) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: buildParams(options, context) as JsonValue,
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  };
}

/** How each popup placement builds its view params from the menu's handler argument. */
const popupMenuParams: Record<PluginPopupPlacement, ParamsBuilder> = {
  "editor.query.context": editorParams,
  "editor.query.toolbar": editorParams,
  "results.cell.context": ({ item }: { item: CellComponent }) => buildParamsForTableMenu(item, "cell"),
  "results.columnHeader.context": ({ item }: { item: ColumnComponent }) => buildParamsForTableMenu(item, "column"),
  "results.rowHeader.context": ({ item }: { item: CellComponent }) => buildParamsForTableMenu(item.getRow(), "row"),
  "results.corner.context": ({ item }: { item: CellComponent }) => buildParamsForTableMenu(item, "corner"),
  "results.statusbar": buildParamsForStatusbar,
  "tableTable.cell.context": ({ item }: { item: CellComponent }) => buildParamsForTableMenu(item, "cell"),
  "tableTable.columnHeader.context": ({ item }: { item: ColumnComponent }) => buildParamsForTableMenu(item, "column"),
  "tableTable.rowHeader.context": ({ item }: { item: CellComponent }) => buildParamsForTableMenu(item.getRow(), "row"),
  "tableTable.corner.context": ({ item }: { item: CellComponent }) => buildParamsForTableMenu(item, "corner"),
  "tableTable.statusbar": buildParamsForStatusbar,
  "tab.query.header.context": ({ item }: { item: TransportOpenTab }, context) => ({
    tab: context.store.serializeTab(item),
  }),
  "tab.table.header.context": ({ item }: { item: TransportOpenTab }, context) => ({
    tab: context.store.serializeTab(item),
  }),
  "entity.table.context": ({ item }: { item: DatabaseEntity }): EntityMenuParams => ({
    entity: { type: "table", schema: item.schema, name: item.name },
  }),
  "entity.schema.context": ({ item }: { item: string }): EntityMenuParams => ({
    entity: { type: "schema", name: item },
  }),
  "entity.routine.context": ({ item }: { item: DatabaseEntity }): EntityMenuParams => ({
    entity: { type: "routine", schema: item.schema, name: item.name },
  }),
  "structure.statusbar.menu": ({ item }: { item: TableOrView }): EntityMenuParams => ({
    entity: { type: item.entityType, name: item.name, schema: item.schema },
  }),
};

const pluginMenuFactories: MenuFactories = {
  newTabDropdown: {
    create(context, menuItem, { keyPath }) {
      return {
        add() {
          context.store.setTabDropdownItem({
            manifest: context.manifest,
            menuItem,
            keybindingLabel: keyPath ?
              getParsedKeybinding(window.bksConfig, keyPath, "context-menu")
              : undefined,
          });
        },
        remove() {
          context.store.unsetTabDropdownItem({
            manifest: context.manifest,
            menuItem,
          });
        },
        keybindingHandler() {
          context.createNewTab(menuItem.view, menuItem.command);
        },
      };
    },
  },
  "menubar.tools": {
    create(context, menuItem, { keyPath }) {
      const id = `${context.manifest.id}-${menuItem.command}`;
      const accelerator = keyPath ?
        getParsedKeybinding(window.bksConfig, keyPath, "electron")
        : undefined;
      const item: NativePluginMenuItem = {
        id,
        pluginId: context.manifest.id,
        label: menuItem.name,
        command: menuItem.command,
        accelerator,
      };
      return {
        add() {
          context.store.addMenuBarItem({
            id,
            label: menuItem.name,
            parentId: "tools",
            disableWhenDisconnected: true,
            accelerator,
            action: { event: AppEvent.pluginMenuClicked, args: item },
          });
          window.main.addNativeMenuItem(item);
        },
        remove: () => {
          context.store.removeMenuBarItem(id);
          window.main.removeNativeMenuItem(id);
        },
      };
    },
  },
  ..._.mapValues(popupMenuParams, (buildParams, placement: PluginPopupPlacement) =>
    popupMenuFactory(placement, buildParams)
  ),
};

export default pluginMenuFactories;
