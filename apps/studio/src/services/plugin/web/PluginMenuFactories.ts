import { TransportOpenTab } from "@/common/transport/TransportOpenTab";
import type { DatabaseEntity, TableOrView } from "@/lib/db/models";
import _ from "lodash";
import {
  CellComponent,
  ColumnComponent,
  RangeComponent,
  RowComponent,
} from "tabulator-tables";
import { MenuFactories } from "./PluginMenuManager";
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
import { NativePluginMenuItem } from "../types";

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

const pluginMenuFactories: MenuFactories = {
  newTabDropdown: {
    create(context, menuItem) {
      return {
        add() {
          context.store.setTabDropdownItem({
            manifest: context.manifest,
            menuItem,
          });
        },
        remove() {
          context.store.unsetTabDropdownItem({
            manifest: context.manifest,
            menuItem,
          });
        },
      };
    },
  },
  "menubar.tools": {
    create(context, menuItem) {
      const id = `${context.manifest.id}-${menuItem.command}`;
      const item: NativePluginMenuItem = {
        id,
        pluginId: context.manifest.id,
        label: menuItem.name,
        command: menuItem.command,
      };
      return {
        add() {
          context.store.addMenuBarItem({
            id,
            label: menuItem.name,
            parentId: "tools",
            disableWhenDisconnected: true,
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
  "editor.query.context": {
    create(context, menuItem) {
      const menuId = "editor.query";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (_event, payload) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: {
                    text: payload.text,
                    selectedText: payload.selectedText,
                    selectedQuery: payload.selectedQuery,
                  },
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "results.cell.context": {
    create(context, menuItem) {
      const menuId = "results.cell";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: buildParamsForTableMenu(options.item, "cell"),
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "results.columnHeader.context": {
    create(context, menuItem) {
      const menuId = "results.columnHeader";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: ColumnComponent }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: buildParamsForTableMenu(options.item, "column"),
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "results.rowHeader.context": {
    create(context, menuItem) {
      const menuId = "results.rowHeader";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: buildParamsForTableMenu(options.item.getRow(), "row"),
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "results.corner.context": {
    create(context, menuItem) {
      const menuId = "results.corner";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: buildParamsForTableMenu(options.item, "corner"),
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "tableTable.cell.context": {
    create(context, menuItem) {
      const menuId = "tableTable.cell";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: buildParamsForTableMenu(options.item, "cell"),
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "tableTable.columnHeader.context": {
    create(context, menuItem) {
      const menuId = "tableTable.columnHeader";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: ColumnComponent }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: buildParamsForTableMenu(options.item, "column"),
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "tableTable.rowHeader.context": {
    create(context, menuItem) {
      const menuId = "tableTable.rowHeader";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: buildParamsForTableMenu(options.item.getRow(), "row"),
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "tableTable.corner.context": {
    create(context, menuItem) {
      const menuId = "tableTable.corner";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: CellComponent }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: buildParamsForTableMenu(options.item, "corner"),
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "tab.query.header.context": {
    create(context, menuItem) {
      const menuId = "tab.query.header";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: TransportOpenTab }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: {
                    tab: context.store.serializeTab(options.item),
                  },
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "tab.table.header.context": {
    create(context, menuItem) {
      const menuId = "tab.table.header";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: TransportOpenTab }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: {
                    tab: context.store.serializeTab(options.item),
                  },
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "entity.table.context": {
    create(context, menuItem) {
      const menuId = "entity.table";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: DatabaseEntity }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: {
                    entity: {
                      type: "table",
                      schema: options.item.schema,
                      name: options.item.name,
                    },
                  },
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "entity.schema.context": {
    create(context, menuItem) {
      const menuId = "entity.schema";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: string }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: {
                    entity: {
                      type: "schema",
                      name: options.item,
                    },
                  },
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "entity.routine.context": {
    create(context, menuItem) {
      const menuId = "entity.routine";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: DatabaseEntity }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: {
                    entity: {
                      type: "routine",
                      schema: options.item.schema,
                      name: options.item.name,
                    },
                  },
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
  "structure.statusbar.menu": {
    create(context, menuItem) {
      const menuId = "structure.statusbar";
      const slug = `${context.manifest.id}-${menuItem.command}`;
      return {
        add() {
          context.store.addPopupMenuItem(menuId, {
            name: menuItem.name,
            slug,
            handler: (options: { item: TableOrView }) => {
              context.store.appEventBus.emit(
                AppEvent.newCustomTab,
                context.store.buildPluginTabInit({
                  manifest: context.manifest,
                  viewId: menuItem.view,
                  command: menuItem.command,
                  params: {
                    entity: {
                      type: options.item.entityType,
                      name: options.item.name,
                      schema: options.item.schema,
                    },
                  },
                })
              );
            },
          });
        },
        remove: () => context.store.removePopupMenuItem(menuId, slug),
      };
    },
  },
};

export default pluginMenuFactories;
