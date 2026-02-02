import { Module } from "vuex";
import { State as RootState } from "../index";
import _ from "lodash";
import { ContextOption } from "@/plugins/BeekeeperPlugin";
import { MenuItem } from "@beekeeperstudio/ui-kit";
import { CellComponent, ColumnComponent, MenuObject, MenuSeparator, RowComponent } from "tabulator-tables";
import { createMenuItem } from "@/lib/menu/tableMenu";
import Vue from "vue";

type TabulatorComponent = RowComponent | ColumnComponent | CellComponent;

type KeybindingDefinition = {
  menuId: string;
  /** The path to the keybinding in the config */
  keybindingPath: string;
  handler: Function;
};

interface State {
  extraPopupMenu: { [menuId: string]: ContextOption[] };
  keybindingDefs: KeybindingDefinition[];
}

export const PopupMenuModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    extraPopupMenu: {},
    keybindingDefs: [],
  }),
  getters: {
    getExtraPopupMenu(state) {
      return (menuId: string, options?: { transform?: "ui-kit" | "tabulator" }) => {
        if (
          state.extraPopupMenu[menuId] &&
          state.extraPopupMenu[menuId].length > 0
        ) {
          if (options?.transform === "ui-kit") {
            return [
              { id: "divider", type: "divider" },
              ...state.extraPopupMenu[menuId].map((item) => ({
                ...item,
                id: item.slug,
                label: item.name,
                handler: item.handler,
              })),
            ] satisfies MenuItem[];
          } else if (options?.transform === "tabulator") {
            return [
              { separator: true },
              ...state.extraPopupMenu[menuId].map((item) => ({
                ...item,
                label: createMenuItem(item.name),
                action(event, component: TabulatorComponent) {
                  item.handler({ event, item: component });
                },
              })),
            ] satisfies (MenuObject<TabulatorComponent> | MenuSeparator)[];
          } else {
            return [
              { type: "divider" },
              ...state.extraPopupMenu[menuId],
            ] satisfies ContextOption[];
          }
        }
        return [];
      };
    },
  },
  mutations: {
    add(state, options: { menuId: string; item: ContextOption }) {
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
    addKeybinding(state, definition: KeybindingDefinition) {
      state.keybindingDefs.push(definition);
    },
    removeKeybinding(state, definition: Omit<KeybindingDefinition, "handler">) {
      const idx = state.keybindingDefs.findIndex(
        (d) =>
          d.menuId === definition.menuId &&
          d.keybindingPath === definition.keybindingPath
      );
      if (idx !== -1) {
        state.keybindingDefs.splice(idx, 1);
      }
    },
  },
};
