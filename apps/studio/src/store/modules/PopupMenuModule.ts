import { Module } from "vuex";
import { State as RootState } from "../index";
import _ from "lodash";
import { ContextOption } from "@/plugins/BeekeeperPlugin";
import { MenuItem } from "@beekeeperstudio/ui-kit";
import { CellComponent, ColumnComponent, MenuObject, MenuSeparator, RowComponent } from "tabulator-tables";
import { createMenuItem } from "@/lib/menu/tableMenu";

type TabulatorComponent = RowComponent | ColumnComponent | CellComponent;

interface State {
  extraPopupMenu: { [menuId: string]: ContextOption[] };
}

export const PopupMenu: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    extraPopupMenu: {},
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
        state.extraPopupMenu[options.menuId] = [];
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
