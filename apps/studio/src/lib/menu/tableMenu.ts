import { Tabulator } from "tabulator-tables";
import { markdownTable } from "markdown-table";
import { DatabaseClient } from "@/lib/db/client";
import { ElectronPlugin } from "@/lib/NativeWrapper";
import Papa from "papaparse";

export const commonColumnMenu = [
  {
    label: createMenuItem("Sort ascending"),
    action: (_: Event, column: Tabulator.ColumnComponent) =>
      column.getTable().setSort(column.getField(), "asc"),
  },
  {
    label: createMenuItem("Sort descending"),
    action: (_: Event, column: Tabulator.ColumnComponent) =>
      column.getTable().setSort(column.getField(), "desc"),
  },
  {
    label: createMenuItem("Hide column"),
    action: (_: Event, column: Tabulator.ColumnComponent) => column.hide(),
  },
  { separator: true },
  {
    label: createMenuItem("Resize all columns to match"),
    action: (_: Event, column: Tabulator.ColumnComponent) => {
      try {
        column.getTable().blockRedraw();
        const columns = column.getTable().getColumns();
        columns.forEach((col) => {
          if (
            col.getField() !==
            column.getTable().modules.spreadsheet.rowHeaderField
          )
            col.setWidth(column.getWidth());
        });
      } catch (error) {
        console.error(error);
      } finally {
        column.getTable().restoreRedraw();
      }
    },
  },
  {
    label: createMenuItem("Resize all columns to fit content"),
    action: (_: Event, column: Tabulator.ColumnComponent) => {
      try {
        column.getTable().blockRedraw();
        const columns = column.getTable().getColumns();
        columns.forEach((col) => {
          if (
            col.getField() !==
            column.getTable().modules.spreadsheet.rowHeaderField
          )
            col.setWidth(true);
        });
      } catch (error) {
        console.error(error);
      } finally {
        column.getTable().restoreRedraw();
      }
    },
  },
  {
    label: createMenuItem("Resize all columns to fixed width"),
    action: (_: Event, column: Tabulator.ColumnComponent) => {
      try {
        column.getTable().blockRedraw();
        const columns = column.getTable().getColumns();
        columns.forEach((col) => {
          if (
            col.getField() !==
            column.getTable().modules.spreadsheet.rowHeaderField
          )
            col.setWidth(200);
        });
      } catch (error) {
        console.error(error);
      } finally {
        column.getTable().restoreRedraw();
      }
    },
  },
];


export function createMenuItem(label: string, shortcut = "") {
  label = `<x-label>${label}</x-label>`;
  if (shortcut) shortcut = `<x-shortcut value="${shortcut}" />`;
  return `<x-menuitem>${label}${shortcut}</x-menuitem>`;
}

export async function copyRange(options: {
  range: Tabulator.RangeComponent;
  type: "tsv" | "json" | "markdown" | "sql";
  connection?: DatabaseClient;
  table?: string;
  schema?: string;
}) {
  let text = "";
  switch (options.type) {
    case "tsv":
      text = Papa.unparse(options.range.getData(), {
        header: false,
        delimiter: "\t",
        quotes: true,
        escapeFormulae: true,
      });
      break;
    case "json":
      text = JSON.stringify(options.range.getData());
      break;
    case "markdown": {
      const data = options.range.getData();
      const headers = Object.keys(data[0]);
      text = markdownTable([
        headers,
        ...data.map((item) => Object.values(item)),
      ]);
      break;
    }
    case "sql":
      text = await options.connection.getInsertQuery({
        table: options.table,
        schema: options.schema,
        data: options.range.getData(),
      });
      break;
  }
  ElectronPlugin.clipboard.writeText(text);
  options.range.getElement().classList.add("copied");
}

export function copyActionsMenu(options: {
  range: Tabulator.RangeComponent;
  connection: DatabaseClient;
  table: string;
  schema: string;
}) {
  const { range, connection, table, schema } = options;
  return [
    {
      label: createMenuItem("Copy as TSV for Excel", "Control+C"),
      action: () => copyRange({ range, type: "tsv" }),
    },
    {
      label: createMenuItem("Copy as JSON"),
      action: () => copyRange({ range, type: "json" }),
    },
    {
      label: createMenuItem("Copy as Markdown"),
      action: () => copyRange({ range, type: "markdown" }),
    },
    {
      label: createMenuItem("Copy as SQL"),
      action: () =>
        copyRange({ range, type: "sql", connection, table, schema }),
    },
  ];
}
