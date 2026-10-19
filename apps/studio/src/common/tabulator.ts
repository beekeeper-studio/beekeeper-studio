// @ts-nocheck tabulator is not fully typed

import {
  ColumnComponent,
  Options as TabulatorOptions,
  RangeComponent,
  Tabulator,
  TabulatorFull,
} from "tabulator-tables";
import { isBksInternalColumn, rowHeaderField } from "@/common/utils";
import _ from "lodash";
import rawLog from "@bksLogger";

const log = rawLog.scope("common/tabulator");

interface Options extends TabulatorOptions {
  table?: string;
  schema?: string;
  onRangeChange?: (ranges: RangeComponent[]) => void;
  /** Called with the number of selected cells, or 0 when nothing is selected. */
  onSelectedCellsChange?: (cells: number) => void;
}

export interface TabulatorFormatterParams {
  fk?: any[];
  isPK?: boolean;
  fkOnClick?: (e: MouseEvent, cell: CellComponent) => void
  binaryEncoding?: string
}

export function tabulatorForTableData(
  el: string | HTMLElement,
  options: Options
): TabulatorFull {
  const { table, schema, onSelectedCellsChange: onCellsChange, ...tabulatorOptions } = options;
  const defaultOptions: Options = {
    persistence: {
      columns: ["width", "visible"],
    },
    persistenceMode: "local",
    persistenceWriterFunc: (id: string, type: string, data: unknown) => {
      try {
        localStorage.setItem(`${id}-${type}`, JSON.stringify(data));
      } catch (e) {
        log.warn(e);
      }
    },
    renderHorizontal: "virtual",
    autoResize: false,
    nestedFieldSeparator: false,
    selectableRange: true,
    selectableRangeColumns: true,
    selectableRangeMode: "ctrl",
    selectableRangeAutoFocus: false,
    selectableRangeRows: true,
    selectableRangeFill: true,
    resizableColumnGuide: true,
    movableColumns: true,
    height: "100%",
    editTriggerEvent: window.bksConfig.ui.tableTable.editTrigger === "click"
      ? "click"
      : "dblclick",
    debugInvalidComponentFuncs: false,
    history: true,
    keybindings: {
      undo: window.bksConfig.getKeybindings("tabulator", "general.undo"),
      redo: window.bksConfig.getKeybindings("tabulator", "general.redo"),
      scrollToStart: false,
      scrollToEnd: false,
    },
    rowHeader: {
      field: rowHeaderField,
      resizable: false,
      frozen: true,
      headerSort: false,
      editor: false,
      htmlOutput: false,
      print: false,
      clipboard: false,
      download: false,
      minWidth: 38,
      width: 38,
      hozAlign: "center",
      formatter: "rownum",
      formatterParams: {
        relativeToPage: true,
        binaryEncoding: window.bksConfig.ui.general.binaryEncoding,
      },
    },
  };
  const mergedOptions = _.merge(defaultOptions, tabulatorOptions);
  const tabulator = new TabulatorFull(el, mergedOptions);

  if (options.onRangeChange) {
    const onRangeChange = () => {
      options.onRangeChange(tabulator.getRanges());
    };
    tabulator.on("cellMouseUp", onRangeChange);
    tabulator.on("headerMouseUp", onRangeChange);
    tabulator.on(
      "keyNavigate",
      // This is slow if we do a long press. Debounce it so it feels good.
      _.debounce(onRangeChange, 100, {
        leading: true, trailing: true
      })
    );
    // Tabulator range is reset after data is processed
    tabulator.on("dataProcessed", onRangeChange);
  }
  if (onCellsChange) {
    onSelectedCellsChange(tabulator, onCellsChange);
  }
  return tabulator
}

/** Columns that hold data, leaving out internal ones such as the row header
 * and foreign key links. */
export function dataColumns(columns: ColumnComponent[]): ColumnComponent[] {
  return columns.filter((column) => !isBksInternalColumn(column.getField() ?? ""));
}

export function rangeCellCount(range: RangeComponent): number {
  return range.getRows().length * dataColumns(range.getColumns()).length;
}

/** Tabulator's range modes after a click on a row header, column header or the corner. */
const HEADER_SELECTING = ["row", "column", "all"];

/**
 * The latest range, when the user selected it: more than the one cell under
 * the cursor, or a row or column picked from its header, which is a single
 * cell in a one-column or one-row result.
 */
export function selectedRange(tabulator: Tabulator): RangeComponent | null {
  const range = _.last(tabulator.getRanges?.() ?? []);
  if (!range) return null;
  // Not public API: the range module keeps the mode of the latest selection
  const selecting = tabulator.modules?.selectRange?.selecting;
  return rangeCellCount(range) > 1 || HEADER_SELECTING.includes(selecting) ? range : null;
}

/**
 * Report the number of selected cells, or 0 without a selection, whenever a
 * range is added, resized or removed. Range events also fire when the
 * keyboard resizes a range (Shift+Arrow). Debounced: dragging fires on every
 * cell.
 */
export function onSelectedCellsChange(tabulator: Tabulator, callback: (cells: number) => void) {
  const report = _.debounce(() => {
    let cells = 0;
    try {
      const range = selectedRange(tabulator);
      cells = range ? rangeCellCount(range) : 0;
    } catch {
      // The table was destroyed (e.g. replaced by a new result) before this ran
      return;
    }
    callback(cells);
  }, 50);
  for (const event of ["rangeAdded", "rangeChanged", "rangeRemoved", "dataProcessed"]) {
    tabulator.on(event, report);
  }
}
