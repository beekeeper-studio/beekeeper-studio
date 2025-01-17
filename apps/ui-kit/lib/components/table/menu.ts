import {
  CellComponent,
  RangeComponent,
  Tabulator,
} from "tabulator-tables";
import { markdownTable } from "markdown-table";
import Papa from "papaparse";
import { stringifyRangeData, rowHeaderField } from "./tabulator";
import _ from "lodash";
// ?? not sure about this but :shrug:
import Vue from "vue";
import { readClipboard, writeClipboard } from "../../utils/clipboard";
import { MenuItem as ColumnMenuItem, divider } from "../context-menu/menu";
import { ctrlOrCmd } from "../../utils/platform";

type RangeData = Record<string, any>[];
interface ExtractedData {
  data: RangeData;
  sources: RangeComponent[];
}

export const sortAscending: ColumnMenuItem = {
  name: "Sort ascending",
  slug: "column-sort-asc",
  handler: (_, column) => column.getTable().setSort(column.getField(), "asc"),
};

export const sortDescending: ColumnMenuItem = {
  name: "Sort descending",
  slug: "column-sort-desc",
  handler: (_, column) => column.getTable().setSort(column.getField(), "desc"),
};

export const hideColumn: ColumnMenuItem = {
  name: "Hide column",
  slug: "column-hide",
  handler: (_, column) => column.hide(),
};

export const resizeAllColumnsToMatch: ColumnMenuItem = {
  name: "Resize all columns to match",
  slug: "columns-resize-all-to-match",
  handler: (_, column) => {
    try {
      column.getTable().blockRedraw();
      const columns = column.getTable().getColumns();
      columns.forEach((col) => {
        if (col.getField() !== rowHeaderField) {
          col.setWidth(column.getWidth());
        }
      });
    } catch (error) {
      console.error(error);
    } finally {
      column.getTable().restoreRedraw();
    }
  },
};

export const resizeAllColumnsToFitContent: ColumnMenuItem = {
  name: "Resize all columns to fit content",
  slug: "columns-resize-all-to-fit-content",
  handler: (_, column) => resizeAllColumnsToFitContentAction(column.getTable()),
};

export const resizeAllColumnsToFixedWidth: ColumnMenuItem = {
  name: "Resize all columns to fixed width",
  slug: "columns-resize-all-to-fixed-width",
  handler: (_, column) => {
    try {
      column.getTable().blockRedraw();
      const columns = column.getTable().getColumns();
      columns.forEach((col) => {
        if (col.getField() !== rowHeaderField) {
          col.setWidth(200);
        }
      });
    } catch (error) {
      console.error(error);
    } finally {
      column.getTable().restoreRedraw();
    }
  },
};

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

export const commonColumnMenu = [
  sortAscending,
  sortDescending,
  divider,
  resizeAllColumnsToMatch,
  resizeAllColumnsToFitContent,
  resizeAllColumnsToFixedWidth,
];

export async function copyRanges(options: {
  ranges: RangeComponent[];
  type: "plain" | "tsv" | "json" | "markdown";
}): Promise<void>;
export async function copyRanges(options: {
  ranges: RangeComponent[];
  type: "plain" | "tsv" | "json" | "markdown";
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
  }
  writeClipboard(text);
  extractedData.sources.forEach((range) => {
    (range.getElement() as HTMLElement).classList.add("copied");
  });
}

function extractRanges(ranges: RangeComponent[]): ExtractedData {
  if (ranges.length === 0) return;

  if (ranges.length === 1) {
    return {
      data: ranges[0].getData() as RangeData,
      sources: [ranges[0]],
    };
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
    return {
      data: ranges.reduce((data, range) => data.concat(range.getData()), []),
      sources: ranges,
    };
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
    return {
      data: rows,
      sources: ranges,
    };
  }

  const source = _.first(ranges);
  return {
    data: source.getData() as RangeData,
    sources: [source],
  };
}

function countCellsFromData(data: RangeData) {
  return data.reduce((acc, row) => acc + Object.keys(row).length, 0);
}

export async function pasteRange(range: RangeComponent) {
  const text = await readClipboard();
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

export function copyActionsMenu(options: {
  ranges: RangeComponent[];
  table?: string;
  schema?: string;
}): ColumnMenuItem[] {
  const { ranges } = options;
  return [
    {
      name: "Copy",
      slug: 'range-copy',
      handler: () => copyRanges({ ranges, type: "plain" }),
      shortcut: ctrlOrCmd("c"),
    },
    {
      name: "Copy as TSV for Excel",
      slug: 'range-copy-tsv',
      handler: () => copyRanges({ ranges, type: "tsv" }),
    },
    {
      name: "Copy as JSON",
      slug: 'range-copy-json',
      handler: () => copyRanges({ ranges, type: "json" }),
    },
    {
      name: "Copy as Markdown",
      slug: 'range-copy-markdown',
      handler: () => copyRanges({ ranges, type: "markdown" }),
    },
  ];
}

export function pasteActionsMenu(range: RangeComponent): ColumnMenuItem[] {
  return [
    {
      name: "Paste",
      slug: 'range-paste',
      handler: () => pasteRange(range),
      shortcut: ctrlOrCmd("v"),
    },
  ];
}
