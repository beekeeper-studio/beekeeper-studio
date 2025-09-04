import { TransportOpenTab } from "@/common/transport/TransportOpenTab";
import { DatabaseEntity } from "@/lib/db/models";
import _ from "lodash";
import { CellComponent } from "tabulator-tables";
import { MenuFactories } from "./PluginMenuManager";

const pluginMenuFactories: MenuFactories = {
  newTabDropdown: {
    create(context, menuItem) {
      return {
        add() {
          context.store.addTabTypeConfig({
            manifest: context.manifest,
            menuItem,
          });
        },
        remove() {
          context.store.removeTabTypeConfig({
            manifest: context.manifest,
            menuItem,
          });
        },
      };
    },
  },
  "menubar.tools": {
    create(context, _menuItem) {
      return {
        add: () => context.log.error("not implemented"),
        remove: () => context.log.error("not implemented"),
      };
    },
  },
  "editor.query.context": {
    create(context, menuItem) {
      const menuId = "editor.query";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (...args) => {
              // FIXME send the args
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
                args: {
                  text: "[[TEXT]]",
                  selectedText: "[[SELECTED_TEXT]]",
                  selectedQuery: "[[SELECTED_QUERY]]",
                },
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "results.cell.context": {
    create(context, menuItem) {
      const menuId = "results.cell";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              // FIXME send the args
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "results.columnHeader.context": {
    create(context, menuItem) {
      const menuId = "results.column-header";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              // FIXME send the args
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "results.rowHeader.context": {
    create(context, menuItem) {
      const menuId = "result-table.row-header";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              // FIXME send the args
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "results.corner.context": {
    create(context, menuItem) {
      const menuId = "result-table.corner";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              // FIXME send the args
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "tableTable.cell.context": {
    create(context, menuItem) {
      const menuId = "table-table.cell";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              // FIXME send the args
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "tableTable.columnHeader.context": {
    create(context, menuItem) {
      const menuId = "table-table.column-header";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              // FIXME send the args
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "tableTable.rowHeader.context": {
    create(context, menuItem) {
      const menuId = "table-table.row-header";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              // FIXME send the args
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "tableTable.corner.context": {
    create(context, menuItem) {
      const menuId = "table-table.corner";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              // FIXME send the args
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "tab.query.header.context": {
    create(context, menuItem) {
      const menuId = "tab.query.header";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: TransportOpenTab }) => {
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
                args: {
                  tab: context.store.serializeTab(options.item),
                },
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "tab.table.header.context": {
    create(context, menuItem) {
      const menuId = "tab.table.header";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: TransportOpenTab }) => {
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
                args: {
                  tab: context.store.serializeTab(options.item),
                },
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "entity.table.context": {
    create(context, menuItem) {
      const menuId = "entity.table";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: DatabaseEntity }) => {
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
                args: {
                  entity: {
                    type: "table",
                    schema: options.item.schema,
                    name: options.item.name,
                  },
                },
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "entity.schema.context": {
    create(context, menuItem) {
      const menuId = "entity.schema";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: string }) => {
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
                args: {
                  entity: {
                    type: "schema",
                    name: options.item,
                  },
                },
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "entity.routine.context": {
    create(context, menuItem) {
      const menuId = "entity.routine";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addContextMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: DatabaseEntity }) => {
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
                args: {
                  entity: {
                    type: "routine",
                    schema: options.item.schema,
                    name: options.item.name,
                  },
                },
              });
            },
          });
        },
        remove() {
          context.store.removeContextMenuItem(menuId, slug);
        },
      };
    },
  },
  "structure.statusbar.menu": {
    create(context, _menuItem) {
      return {
        add: () => context.log.error("not implemented"),
        remove: () => context.log.error("not implemented"),
      };
    },
  },
};

export default pluginMenuFactories;
