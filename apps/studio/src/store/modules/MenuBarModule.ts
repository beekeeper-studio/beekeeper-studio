import { Module } from "vuex";
import { State as RootState } from "../index";
import _ from "lodash";
import MenuBuilder from "@/common/menus/MenuBuilder";
import ClientMenuActionHandler from "@/lib/menu/ClientMenuActionHandler";
import config from "@/config";
import RawLog from "@bksLogger";
import { ExternalMenuItem } from "@/types";

interface State {
  externalMenu: { [menuItemId: string]: ExternalMenuItem };
}

const log = RawLog.scope("MenuBarModule");

const actionHandler = new ClientMenuActionHandler();

export const MenuBarModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    externalMenu: {},
  }),
  getters: {
    connectionMenuItems() {
      return [
        "new-query-menu",
        "go-to",
        "disconnect",
        "import-sql-files",
        "close-tab",
        "menu-toggle-sidebar",
        "menu-secondary-sidebar",
        "backup-database",
        "restore-database",
        "export-tables",
      ];
    },
    menus(state, _getters, rootState) {
      const builder = new MenuBuilder(
        rootState["settings/settings"],
        actionHandler,
        config,
        window.bksConfig
      );

      const menus = builder.buildTemplate();

      for (const externalItem of Object.values(state.externalMenu)) {
        const parent = menus.find((item) => item.id === externalItem.parentId);

        if (!parent) {
          log.warn(`Parent menu not found: "${externalItem.parentId}"`);
          continue;
        }

        (parent.submenu as Electron.MenuItemConstructorOptions[]).push({
          label: externalItem.label,
          click: () => {
            actionHandler.handleAction(externalItem.action);
          },
        });
      }

      return menus;
    },
  },
  mutations: {
    add(state, menuItem: ExternalMenuItem) {
      if (state.externalMenu[menuItem.id]) {
        throw new Error(`Menu item ${menuItem.id} already exists`);
      }
      state.externalMenu = {
        ...state.externalMenu,
        [menuItem.id]: menuItem,
      };
    },
    remove(state, id: string) {
      if (!state.externalMenu[id]) {
        throw new Error(`Menu item ${id} does not exist`);
      }
      state.externalMenu = _.omit(state.state.externalMenu, id);
    },
  },
};
