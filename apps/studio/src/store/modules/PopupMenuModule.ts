import { Module } from "vuex";
import { State as RootState } from "../index";
import _ from "lodash";
import { ContextItem, ContextOption, toMenuItem } from "@/plugins/BeekeeperPlugin";
import { divider, sectionLabel, MenuItem } from "@beekeeperstudio/ui-kit";
import { CellComponent, ColumnComponent, MenuObject, MenuSeparator, RowComponent } from "tabulator-tables";
import { createMenuItem, createMenuSectionLabel } from "@/lib/menu/tableMenu";
import { AppEvent } from "@/common/AppEvent";
import type { PluginMenuItemCondition } from "@/services/plugin/types";
import Vue from "vue";

type TabulatorComponent = RowComponent | ColumnComponent | CellComponent;

interface State {
  extraPopupMenu: { [menuId: string]: ContextItem[] };
}

export type PluginMenuConditions = Partial<Record<PluginMenuItemCondition, boolean>>;

export const PLUGINS_SECTION_LABEL = "Plugins";

export function openPluginManager() {
  // Routed through the main process, like the Tools > Manage Plugins menu item
  window.main.send(AppEvent.menuClick, "managePlugins");
}

export const managePluginsItem: ContextItem = {
  name: "Manage Plugins…",
  slug: "manage-plugins",
  leadingIcon: "extension",
  handler: openPluginManager,
};

/** Plugin items sorted A–Z by plugin name. Each plugin's items keep the order
 * they were added in (manifest order). */
function sortedItems(items: ContextItem[]) {
  return _.sortBy(items, (item) => item.plugin?.name.toLowerCase() ?? "");
}

function applyConditions(items: ContextItem[], conditions?: PluginMenuConditions) {
  if (!conditions) return items;
  return items.map((item) =>
    item.enabledWhen && !conditions[item.enabledWhen]
      ? { ...item, disabled: true }
      : item
  );
}

export const PopupMenuModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    extraPopupMenu: {},
  }),
  getters: {
    /** The plugin items of a menu, sorted, without any section chrome. */
    getPluginMenuItems(state) {
      return (menuId: string, options?: { conditions?: PluginMenuConditions }): ContextItem[] => {
        const items = state.extraPopupMenu[menuId] ?? [];
        return applyConditions(sortedItems(items), options?.conditions);
      };
    },
    /**
     * The plugin section appended to a context menu: a divider, a "Plugins"
     * label, the plugin items, then a divider and "Manage Plugins…". Empty
     * when no plugin adds items to the menu.
     */
    getExtraPopupMenu(_state, getters) {
      return (
        menuId: string,
        options?: {
          transform?: "ui-kit" | "tabulator";
          /** Extra fields merged into the argument each item's handler receives. */
          payload?: Record<string, unknown>;
          conditions?: PluginMenuConditions;
        }
      ) => {
        const pluginItems: ContextItem[] = getters.getPluginMenuItems(menuId, options);
        if (pluginItems.length === 0) {
          return [];
        }

        if (options?.transform === "ui-kit") {
          const payload = options.payload;
          const items = payload
            ? pluginItems.map((item) => ({
                ...item,
                handler: (args: Record<string, unknown>) => item.handler({ ...args, ...payload }),
              }))
            : pluginItems;
          return [
            divider,
            sectionLabel(PLUGINS_SECTION_LABEL),
            ...items.map(toMenuItem),
            divider,
            toMenuItem(managePluginsItem),
          ] satisfies MenuItem[];
        } else if (options?.transform === "tabulator") {
          return [
            { separator: true },
            { label: createMenuSectionLabel(PLUGINS_SECTION_LABEL), disabled: true },
            ...pluginItems.map((item) => ({
              label: createMenuItem(item.name, "", false, item.leadingIcon),
              disabled: item.disabled,
              action(event, component: TabulatorComponent) {
                item.handler({ event, item: component });
              },
            })),
            { separator: true },
            {
              label: createMenuItem(managePluginsItem.name, "", false, managePluginsItem.leadingIcon),
              action: () => openPluginManager(),
            },
          ] satisfies (MenuObject<TabulatorComponent> | MenuSeparator)[];
        } else {
          return [
            divider,
            sectionLabel(PLUGINS_SECTION_LABEL),
            ...pluginItems,
            divider,
            managePluginsItem,
          ] satisfies ContextOption[];
        }
      };
    },
  },
  mutations: {
    add(state, options: { menuId: string; item: ContextItem }) {
      if (
        state.extraPopupMenu[options.menuId]?.find(
          (i) => i.slug === options.item.slug
        )
      ) {
        throw new Error(`Menu item ${options.item.slug} already exists`);
      }

      if (!state.extraPopupMenu[options.menuId]) {
        Vue.set(state.extraPopupMenu, options.menuId, []);
      }

      state.extraPopupMenu[options.menuId].push(options.item);
    },
    remove(state, options: { menuId: string; slug: string }) {
      if (!state.extraPopupMenu[options.menuId]) {
        return;
      }
      state.extraPopupMenu[options.menuId] = state.extraPopupMenu[
        options.menuId
      ].filter((i) => i.slug !== options.slug);
    },
  },
};
