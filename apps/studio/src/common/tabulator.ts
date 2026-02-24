// @ts-nocheck tabulator is not fully typed

import {
  Options as TabulatorOptions,
  RangeComponent,
  TabulatorFull,
} from "tabulator-tables";
import {
  copyActionsMenu,
  resizeAllColumnsToFitContent,
  resizeAllColumnsToFixedWidth,
} from "@/lib/menu/tableMenu";
import { rowHeaderField } from "@/common/utils";
import _ from "lodash";

interface Options extends TabulatorOptions {
  table?: string;
  schema?: string;
  onRangeChange?: (ranges: RangeComponent[]) => void;
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
  const { table, schema, ...tabulatorOptions } = options;
  const defaultOptions: Options = {
    persistence: {
      columns: ["width", "visible"],
    },
    persistenceMode: "local",
    renderHorizontal: "virtual",
    autoResize: false,
    nestedFieldSeparator: false,
    selectableRange: true,
    selectableRangeColumns: true,
    selectableRangeAutoFocus: false,
    selectableRangeRows: true,
    resizableColumnGuide: true,
    movableColumns: true,
    height: "100%",
    editTriggerEvent: "dblclick",
    debugInvalidComponentFuncs: false,
    history: true,
    keybindings: {
      undo: window.bksConfig.getKeybindings("tabulator", "general.undo"),
      redo: window.bksConfig.getKeybindings("tabulator", "general.redo"),
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
      contextMenu: (_e, cell) => {
        return copyActionsMenu({ ranges: cell.getRanges(), table: table || "mytable", schema });
      },
      headerContextMenu: (_e, column) => {
        return [
          ...copyActionsMenu({
            ranges: column.getTable().getRanges(),
            table: table || "mytable",
            schema,
          }),
          { separator: true },
          resizeAllColumnsToFitContent,
          resizeAllColumnsToFixedWidth,
        ];
      },
    },
  };
  const mergedOptions = _.merge(defaultOptions, tabulatorOptions);
  const tabulator = new TabulatorFull(el, mergedOptions);
  if (options.onRangeChange) {
    function onRangeChange() {
      options.onRangeChange(tabulator.getRanges());
    }
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
  return tabulator
}
