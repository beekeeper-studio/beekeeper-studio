import { Tabulator } from "tabulator-tables";
import { markdownTable } from "markdown-table";
import { DatabaseClient } from "@/lib/db/client";
import { ElectronPlugin } from "@/lib/NativeWrapper";
import Papa from "papaparse";
import { stringifyRangeData } from "@/common/utils";

type ColumnMenuItem = Tabulator.MenuObject<Tabulator.ColumnComponent>;

export const sortAscending: ColumnMenuItem = {
  label: createMenuItem("Sort ascending"),
  action: (_, column) => column.getTable().setSort(column.getField(), "asc"),
};

export const sortDescending: ColumnMenuItem = {
  label: createMenuItem("Sort descending"),
  action: (_, column) => column.getTable().setSort(column.getField(), "desc"),
};

export const hideColumn: ColumnMenuItem = {
  label: createMenuItem("Hide column"),
  action: (_, column) => column.hide(),
};

export const resizeAllColumnsToMatch: ColumnMenuItem = {
  label: createMenuItem("Resize all columns to match"),
  action: (_, column) => {
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
};

export const resizeAllColumnsToFitContent: ColumnMenuItem = {
  label: createMenuItem("Resize all columns to fit content"),
  action: (_, column) => {
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
};

export const resizeAllColumnsToFixedWidth: ColumnMenuItem = {
  label: createMenuItem("Resize all columns to fixed width"),
  action: (_, column) => {
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
};

export const commonColumnMenu = [
  sortAscending,
  sortDescending,
  { separator: true },
  resizeAllColumnsToMatch,
  resizeAllColumnsToFitContent,
  resizeAllColumnsToFixedWidth,
];

export function createMenuItem(label: string, shortcut = "") {
  label = `<x-label>${label}</x-label>`;
  if (shortcut) shortcut = `<x-shortcut value="${shortcut}" />`;
  return `<x-menuitem>${label}${shortcut}</x-menuitem>`;
}

export async function copyRange(options: {
  range: Tabulator.RangeComponent;
  type: "plain" | "tsv" | "json" | "markdown" | "sql";
  connection?: DatabaseClient;
  table?: string;
  schema?: string;
}) {
  let text = "";
  const rangeData = options.range.getData();
  const stringifiedRangeData = stringifyRangeData(rangeData);

  switch (options.type) {
    case "plain": {
      if (options.range.getCells().flat().length === 1) {
        const key = Object.keys(stringifiedRangeData[0])[0];
        text = stringifiedRangeData[0][key];
      } else {
        text = Papa.unparse(stringifiedRangeData, {
          header: false,
          delimiter: "\t",
          quotes: false,
          escapeFormulae: false,
        });
      }
      break;
    }
    case "tsv":
      text = Papa.unparse(stringifiedRangeData, {
        header: false,
        delimiter: "\t",
        quotes: true,
        escapeFormulae: true,
      });
      break;
    case "json":
      text = JSON.stringify(rangeData);
      break;
    case "markdown": {
      const headers = Object.keys(stringifiedRangeData[0]);
      text = markdownTable([
        headers,
        ...stringifiedRangeData.map((item) => Object.values(item)),
      ]);
      break;
    }
    case "sql":
      text = await options.connection.getInsertQuery({
        table: options.table,
        schema: options.schema,
        data: rangeData,
      });
      break;
  }
  ElectronPlugin.clipboard.writeText(text);
  options.range.getElement().classList.add("copied");
}

export function pasteRange(range: Tabulator.RangeComponent) {
  const text = ElectronPlugin.clipboard.readText();
  if (!text) return;

  const parsedText = Papa.parse(text, {
    header: false,
    delimiter: "\t",
  });

  if (parsedText.errors.length > 0) {
    const cell = range.getCells()[0][0];
    setCellValue(cell, text);
  } else {
    const table = range.getRows()[0].getTable();
    const rows = table.modules.selectRange.getTableRows().slice(range.getTopEdge());
    const columns = table.modules.selectRange
      .getTableColumns()
      .slice(range.getLeftEdge());
    const cells: Tabulator.CellComponent[][] = rows.map((row) => {
      const arr = [];
      row.getCells().forEach((cell) => {
        if (columns.includes(cell.column)) {
          arr.push(cell.getComponent());
        }
      });
      return arr;
    });

    parsedText.data.forEach((row: string[], rowIdx) => {
      row.forEach((text, colIdx) => {
        const cell = cells[rowIdx]?.[colIdx];
        if (!cell) return;
        setCellValue(cell, text);
      });
    });
  }
}

export function setCellValue(cell: Tabulator.CellComponent, value: string) {
  const editableFunc = cell.getColumn().getDefinition().editable;
  const editable =
    typeof editableFunc === "function" ? editableFunc(cell) : editableFunc;
  if (editable) cell.setValue(value);
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
      label: createMenuItem("Copy", "Control+C"),
      action: () => copyRange({ range, type: "plain" }),
    },
    {
      label: createMenuItem("Copy as TSV for Excel"),
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

export function pasteActionsMenu(range: Tabulator.RangeComponent) {
  return [
    {
      label: createMenuItem("Paste", "Control+V"),
      action: () => pasteRange(range),
    },
  ];
}
