import {
  CellComponent,
  RangeComponent,
  Tabulator,
} from "tabulator-tables";
import { markdownTable } from "markdown-table";
import { ElectronPlugin } from "@/lib/NativeWrapper";
import Papa from "papaparse";
import { stringifyRangeData, rowHeaderField } from "@/common/utils";
import _ from "lodash";
// ?? not sure about this but :shrug:
import Vue from "vue";

type RangeData = Record<string, any>[];

export function resizeAllColumnsToFitContentAction(table: Tabulator) {
  try {
    const columns = table.getColumns();
    columns.forEach((col) => {
      if (col.getField() !== rowHeaderField) {
        col.setWidth(true);
      }
    });
  } catch (error) {
    console.error(error);
  } finally {
    table.restoreRedraw();
  }
}

export async function copyRanges(options: {
  ranges: RangeComponent[];
  type: "plain" | "tsv" | "json" | "markdown";
}): Promise<void>;
export async function copyRanges(options: {
  ranges: RangeComponent[];
  type: "sql";
  table: string;
  schema?: string;
}): Promise<void>;
export async function copyRanges(options: {
  ranges: RangeComponent[];
  type: "plain" | "tsv" | "json" | "markdown" | "sql";
  table?: string;
  schema?: string;
}) {
  let text = "";

  const extractedData = extractRanges(options.ranges);
  const rangeData = extractedData.data;
  const stringifiedRangeData = stringifyRangeData(rangeData);

  switch (options.type) {
    case "plain": {
      if (countCellsFromData(rangeData) === 1) {
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
      text = await Vue.prototype.$util.send("conn/getInsertQuery", {
        tableInsert: {
          table: options.table,
          schema: options.schema,
          data: rangeData,
        },
      });
      break;
  }
  ElectronPlugin.clipboard.writeText(text);
  extractedData.sources.forEach((range) => {
    (range.getElement() as HTMLElement).classList.add("copied");
  });
}

export function extractRanges(ranges: RangeComponent[]): RangeData {
  if (ranges.length === 0) return;

  if (ranges.length === 1) {
    return ranges[0].getData() as RangeData;
  }

  let sameColumns = true;
  let sameRows = true;
  const firstCols = ranges[0].getColumns();
  const firstRows = ranges[0].getRows();

  for (let i = 1; i < ranges.length; i++) {
    if (!_.isMatch(firstCols, ranges[i].getColumns())) {
      sameColumns = false;
    }

    if (!_.isMatch(firstRows, ranges[i].getRows())) {
      sameRows = false;
    }

    if (!sameColumns && !sameRows) break;
  }

  if (sameColumns) {
    return ranges.reduce((data, range) => data.concat(range.getData()), []);
  }

  if (sameRows) {
    const sorted = _.sortBy(ranges, (range) => range.getLeftEdge());
    const rows = sorted[0].getData() as RangeData;
    for (let i = 1; i < sorted.length; i++) {
      const data = sorted[i].getData() as RangeData;
      for (let i = 0; i < data.length; i++) {
        _.forEach(data[i], (value, key) => {
          rows[i][key] = value;
        });
      }
    }
    return rows
  }

  const source = _.first(ranges);
  return source.getData() as RangeData;
}

function countCellsFromData(data: RangeData) {
  return data.reduce((acc, row) => acc + Object.keys(row).length, 0);
}

export function pasteRange(range: RangeComponent) {
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
    const rows = table.getRows("active").slice(range.getTopEdge());
    const columns = table
      .getColumns(false)
      .filter((col) => col.isVisible())
      .slice(range.getLeftEdge());
    const cells: CellComponent[][] = rows.map((row) => {
      const arr = [];
      row.getCells().forEach((cell) => {
        if (columns.includes(cell.getColumn())) {
          arr.push(cell);
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

export function setCellValue(cell: CellComponent, value: string) {
  const editableFunc = cell.getColumn().getDefinition().editable;
  const editable =
    typeof editableFunc === "function" ? editableFunc(cell) : editableFunc;
  if (editable) cell.setValue(value);
}

export function pasteActionsMenu(range: RangeComponent) {
  return [
    {
      name: "Paste",
      shortcut: "Control+V",
      handler: () => pasteRange(range),
    },
  ];
}

export function copyRangeDataAsSqlMenuItem(ranges: RangeComponent[], table: string, schema?: string) {
  return {
    name: 'Copy as SQL',
    type: 'copy',
    handler: () => copyRangeDataAsSql({ data: ranges, table, schema }),
  };
}

export async function copyRangeDataAsSql(options: {
  data: RangeData,
  table?: string;
  schema?: string;
}) {
  let text = "";
  text = await Vue.prototype.$util.send("conn/getInsertQuery", {
    tableInsert: {
      table: options.table,
      schema: options.schema,
      data: options.data,
    },
  });
  ElectronPlugin.clipboard.writeText(text);
}
