import { TransportOpenTab } from "@/common/transport/TransportOpenTab";
import type { DatabaseEntity, TableOrView } from "@/lib/db/models";
import _ from "lodash";
import {
  CellComponent,
  ColumnComponent,
  RangeComponent,
  RowComponent,
} from "tabulator-tables";
import { MenuFactories, MenuFactory } from "./PluginMenuManager";
import { buildParamsForStatusbar } from "./statusbarParams";
import { AppEvent } from "@/common/AppEvent";
import {
  ActiveRange,
  CellMenuParams,
  CellMenuTarget,
  ColumnMenuParams,
  ColumnMenuTarget,
  CornerMenuParams,
  CornerMenuTarget,
  RowMenuParams,
  RowMenuTarget,
} from "@beekeeperstudio/plugin";
import { getParsedKeybinding } from "../utils";
import { NativePluginMenuItem, WebPluginContext } from "../types";
import type { JsonValue } from "@/types";

type BigIntSerialized = number;

function buildParamsForTableMenu(
  component: CellComponent,
  componentType: "cell" | "corner"
): CellMenuParams | CornerMenuParams;
function buildParamsForTableMenu(
  component: ColumnComponent,
  componentType: "column"
): ColumnMenuParams;
function buildParamsForTableMenu(
  component: RowComponent,
  componentType: "row"
): ColumnMenuParams;
function buildParamsForTableMenu(
  component: CellComponent | ColumnComponent | RowComponent,
  componentType: "cell" | "corner" | "column" | "row"
): CellMenuParams | ColumnMenuParams | RowMenuParams | CornerMenuParams {
  const ranges = component.getTable().getRanges();
  let range: RangeComponent;

  if (ranges.length === 0) {
    throw new Error(
      "Range not found. This should never happen. Please report this as a bug."
    );
  }

  if (ranges.length === 1 || componentType === "corner") {
    range = ranges[0];
  } else {
    range =
      ranges.find((range) => {
        if (componentType === "cell") {
          return range._range
            .getCells()
            .find((cell) => cell === component._cell);
        }
        if (componentType === "row") {
          return range._range.getRows().find((row) => row === component._row);
        }
        if (componentType === "column") {
          return range._range
            .getColumns()
            .find((column) => column === component._column);
        }
        return undefined;
      }) || ranges[0];
  }

  const activeRange: ActiveRange = {
    rows: range.getRows().map((row) => row.getPosition() || 1),
    columns: range.getColumns().map((col) => col.getDefinition().title),
    value: range.getStructuredCells().map((row) => {
      return serializeArray(row.map((cell) => cell.getValue()));
    }),
  };

  if (componentType === "cell") {
    const cell = component as CellComponent;
    const target: CellMenuTarget = {
      type: "cell",
      row: cell.getRow().getPosition() || 1,
      column: cell.getColumn().getDefinition().title,
      value: serializeBigInt(cell.getValue()),
    };
    return { target, activeRange };
  }

  if (componentType === "column") {
    const column = component as ColumnComponent;
    const target: ColumnMenuTarget = {
      type: "column",
      rows: range.getRows().map((row) => row.getPosition() || 1),
      column: column.getDefinition().title,
      value: range.getStructuredCells().map((row) => {
        return serializeArray(row.map((cell) => cell.getValue()));
      }),
    };
    return { target, activeRange };
  }

  if (componentType === "row") {
    const row = component as RowComponent;
    const target: RowMenuTarget = {
      type: "row",
      row: row.getPosition() || 1,
      columns: row
        .getCells()
        .map((cell) => cell.getColumn().getDefinition().title),
      value: row.getCells().map((cell) => serializeBigInt(cell.getValue())),
    };
    return { target, activeRange };
  }

  if (componentType === "corner") {
    const target: CornerMenuTarget = {
      type: "corner",
      rows: activeRange.rows,
      columns: activeRange.columns,
      value: activeRange.value,
    };
    return { target, activeRange };
  }

  throw new Error(
    `Unknown component type: ${componentType}. This should never happen. Please report this as a bug.`
  );
}

function serializeBigInt(val: bigint): BigIntSerialized;
function serializeBigInt<T>(val: T): T;
function serializeBigInt(val: unknown): unknown {
  if (typeof val === "bigint") {
    return Number(val);
  }
  return val;
}

function serializeArray<T>(
  arr: T[]
): (T extends bigint ? BigIntSerialized : T)[];
function serializeArray(arr: unknown[]): unknown[] {
  return arr.map((item) => serializeBigInt(item));
}

/**
 * A placement that adds an item to one of the app's popup menus. When the
 * item is picked, the plugin view opens in a new tab with the params built
 * from the menu's handler argument.
 */
function popupMenuFactory<T>(
  menuId: string,
  buildParams: (options: T, context: WebPluginContext) => unknown
): MenuFactory {
  return {
    create(context, menuItem) {
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            leadingIcon: menuItem.icon ?? context.manifest.icon ?? "extension",
            plugin: { id: context.manifest.id, name: context.manifest.name },
            enabledWhen: menuItem.enabledWhen,
            handler: (options: T) => {
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

/** The query editor passes its text in the handler payload. */
function editorParams(
  payload: { text?: string; selectedText?: string; selectedQuery?: string } = {}
) {
  return {
    text: payload.text ?? "",
    selectedText: payload.selectedText ?? "",
    selectedQuery: payload.selectedQuery ?? "",
  };
}

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
          window.main.removeMenuBarItem(id);
        },
      };
    },
  },
  "editor.query.context": popupMenuFactory("editor.query", editorParams),
  "editor.query.toolbar": popupMenuFactory("editor.query.toolbar", editorParams),
  "results.cell.context": popupMenuFactory(
    "results.cell",
    ({ item }: { item: CellComponent }) => buildParamsForTableMenu(item, "cell")
  ),
  "results.columnHeader.context": popupMenuFactory(
    "results.columnHeader",
    ({ item }: { item: ColumnComponent }) => buildParamsForTableMenu(item, "column")
  ),
  "results.rowHeader.context": popupMenuFactory(
    "results.rowHeader",
    ({ item }: { item: CellComponent }) => buildParamsForTableMenu(item.getRow(), "row")
  ),
  "results.corner.context": popupMenuFactory(
    "results.corner",
    ({ item }: { item: CellComponent }) => buildParamsForTableMenu(item, "corner")
  ),
  "results.statusbar": popupMenuFactory("results.statusbar", buildParamsForStatusbar),
  "tableTable.cell.context": popupMenuFactory(
    "tableTable.cell",
    ({ item }: { item: CellComponent }) => buildParamsForTableMenu(item, "cell")
  ),
  "tableTable.columnHeader.context": popupMenuFactory(
    "tableTable.columnHeader",
    ({ item }: { item: ColumnComponent }) => buildParamsForTableMenu(item, "column")
  ),
  "tableTable.rowHeader.context": popupMenuFactory(
    "tableTable.rowHeader",
    ({ item }: { item: CellComponent }) => buildParamsForTableMenu(item.getRow(), "row")
  ),
  "tableTable.corner.context": popupMenuFactory(
    "tableTable.corner",
    ({ item }: { item: CellComponent }) => buildParamsForTableMenu(item, "corner")
  ),
  "tableTable.statusbar": popupMenuFactory("tableTable.statusbar", buildParamsForStatusbar),
  "tab.query.header.context": popupMenuFactory(
    "tab.query.header",
    ({ item }: { item: TransportOpenTab }, context) => ({
      tab: context.store.serializeTab(item),
    })
  ),
  "tab.table.header.context": popupMenuFactory(
    "tab.table.header",
    ({ item }: { item: TransportOpenTab }, context) => ({
      tab: context.store.serializeTab(item),
    })
  ),
  "entity.table.context": popupMenuFactory(
    "entity.table",
    ({ item }: { item: DatabaseEntity }) => ({
      entity: { type: "table", schema: item.schema, name: item.name },
    })
  ),
  "entity.schema.context": popupMenuFactory(
    "entity.schema",
    ({ item }: { item: string }) => ({
      entity: { type: "schema", name: item },
    })
  ),
  "entity.routine.context": popupMenuFactory(
    "entity.routine",
    ({ item }: { item: DatabaseEntity }) => ({
      entity: { type: "routine", schema: item.schema, name: item.name },
    })
  ),
  "structure.statusbar.menu": popupMenuFactory(
    "structure.statusbar",
    ({ item }: { item: TableOrView }) => ({
      entity: { type: item.entityType, name: item.name, schema: item.schema },
    })
  ),
};

export default pluginMenuFactories;
