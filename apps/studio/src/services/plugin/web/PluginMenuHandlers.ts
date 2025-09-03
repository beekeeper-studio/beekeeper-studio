import { TransportOpenTab } from "@/common/transport/TransportOpenTab";
import { DatabaseEntity } from "@/lib/db/models";
import {
  PluginMenuItem,
  PluginMenuItemPlacement,
  PluginView,
  WebPluginContext,
} from "@/services/plugin/types";
import _ from "lodash";
import { CellComponent } from "tabulator-tables";

type MenuHandler = {
  add: (params: {
    context: WebPluginContext;
    menuItem: PluginMenuItem;
    id: string;
  }) => void;
  remove: (params: {
    context: WebPluginContext;
    menuItem: PluginMenuItem;
    id: string;
  }) => void;
};

type MenuHandlers = {
  [View in PluginView["type"]]: {
    [Placement in PluginMenuItemPlacement]: MenuHandler;
  };
};

export const menuHandlers: MenuHandlers = {
  "shell-tab": {
    "new-tab-dropdown": {
      add: ({ context, menuItem }) =>
        context.store.addTabTypeConfig({
          manifest: context.manifest,
          menuItem,
        }),
      remove: ({ context, menuItem }) =>
        context.store.removeTabTypeConfig({
          manifest: context.manifest,
          menuItem,
        }),
    },
    "menubar.tools": {
      add: ({ context }) => context.log.error("not implemented"),
      remove: ({ context }) => context.log.error("not implemented"),
    },
    "editor.query.context": {
      add: ({ context, menuItem, id }) => {
        context.store.addContextMenuItem("query-editor", {
          name: menuItem.name,
          slug: id,
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
            })
          },
        });
      },
      remove: ({ context, id }) => {
        context.store.removeContextMenuItem("query-editor", id);
      },
    },
    "results.cell.context": {
      add: ({ context, menuItem, id }) => {
        context.store.addContextMenuItem("result-table.cell", {
          name: menuItem.name,
          slug: id,
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
      remove: ({ context, id }) => {
        context.store.removeContextMenuItem("result-table.cell", id);
      },
    },
    "results.columnHeader.context": {
      add: ({ context, menuItem, id }) => {
        context.store.addContextMenuItem("result-table.column-header", {
          name: menuItem.name,
          slug: id,
          handler: (options: { item: CellComponent }) => {
            // FIXME send the args
            context.store.createPluginTab({
              manifest: context.manifest,
              viewId: menuItem.view,
              command: menuItem.command,
            });
          },
        })
      },
      remove: ({ context, id }) => {
        context.store.removeContextMenuItem("result-table.column-header", id);
      },
    },
    "results.rowHeader.context": {
      add: ({ context, menuItem, id }) => {
        context.store.addContextMenuItem("result-table.row-header", {
          name: menuItem.name,
          slug: id,
          handler: (options: { item: CellComponent }) => {
            // FIXME send the args
            context.store.createPluginTab({
              manifest: context.manifest,
              viewId: menuItem.view,
              command: menuItem.command,
            });
          },
        })
      },
      remove: ({ context, id }) => {
        context.store.removeContextMenuItem("result-table.row-header", id);
      },
    },
    "results.corner.context": {
      add: ({ context, menuItem, id }) => {
        context.store.addContextMenuItem("result-table.corner", {
          name: menuItem.name,
          slug: id,
          handler: (options: { item: CellComponent }) => {
            // FIXME send the args
            context.store.createPluginTab({
              manifest: context.manifest,
              viewId: menuItem.view,
              command: menuItem.command,
            });
          },
        })
      },
      remove: ({ context, id }) => {
        context.store.removeContextMenuItem("result-table.corner", id);
      },
    },
    "tableTable.cell.context": {
      add: ({ context, menuItem, id }) => {
        context.store.addContextMenuItem("table-table.cell", {
          name: menuItem.name,
          slug: id,
          handler: (options: { item: CellComponent }) => {
            // FIXME send the args
            context.store.createPluginTab({
              manifest: context.manifest,
              viewId: menuItem.view,
              command: menuItem.command,
            });
          },
        })
      },
      remove: ({ context, id }) => {
        context.store.removeContextMenuItem("table-table.cell", id);
      },
    },
    "tableTable.columnHeader.context": {
      add: ({ context, menuItem, id }) => {
        context.store.addContextMenuItem("table-table.column-header", {
          name: menuItem.name,
          slug: id,
          handler: (options: { item: CellComponent }) => {
            // FIXME send the args
            context.store.createPluginTab({
              manifest: context.manifest,
              viewId: menuItem.view,
              command: menuItem.command,
            });
          },
        })
      },
      remove: ({ context, id }) => {
        context.store.removeContextMenuItem("table-table.column-header", id);
      },
    },
    "tableTable.rowHeader.context": {
      add: ({ context, menuItem, id }) => {
        context.store.addContextMenuItem("table-table.row-header", {
          name: menuItem.name,
          slug: id,
          handler: (options: { item: CellComponent }) => {
            // FIXME send the args
            context.store.createPluginTab({
              manifest: context.manifest,
              viewId: menuItem.view,
              command: menuItem.command,
            });
          },
        })
      },
      remove: ({ context, id }) => {
        context.store.removeContextMenuItem("table-table.row-header", id);
      },
    },
    "tableTable.corner.context": {
      add: ({ context, menuItem, id }) => {
        context.store.addContextMenuItem("table-table.corner", {
          name: menuItem.name,
          slug: id,
          handler: (options: { item: CellComponent }) => {
            // FIXME send the args
            context.store.createPluginTab({
              manifest: context.manifest,
              viewId: menuItem.view,
              command: menuItem.command,
            });
          },
        })
      },
      remove: ({ context, id }) => {
        context.store.removeContextMenuItem("table-table.corner", id);
      },
    },
    "tab.header.context": {
      add: ({ context, menuItem, id }) => {
        ["query", "table"].forEach((type) => {
          context.store.addContextMenuItem(`tab-header.${type}`, {
            name: menuItem.name,
            slug: id,
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
        });
      },
      remove: ({ context, id }) => {
        ["query", "table"].forEach((type) => {
          context.store.removeContextMenuItem(`tab-header.${type}`, id);
        });
      },
    },
    "entity.context": {
      add: ({ context, menuItem, id }) => {
        for (const entity of ["table", "schema", "routine"]) {
          context.store.addContextMenuItem(`entity-list.${entity}`, {
            name: menuItem.name,
            slug: id,
            handler: (options: { item: DatabaseEntity }) => {
              context.store.createPluginTab({
                manifest: context.manifest,
                viewId: menuItem.view,
                command: menuItem.command,
                args: {
                  entity: {
                    schema: options.item.schema,
                    name: options.item.name,
                    entityType: options.item.entityType,
                  },
                },
              });
            },
          });
        }
      },
      remove: ({ context, id }) => {
        for (const entity of ["table", "schema", "routine"]) {
          context.store.removeContextMenuItem(`entity-list.${entity}`, id);
        }
      },
    },
    "structure.statusbar": {
      add: ({ context }) => context.log.error("not implemented"),
      remove: ({ context }) => context.log.error("not implemented"),
    },
  },
};
