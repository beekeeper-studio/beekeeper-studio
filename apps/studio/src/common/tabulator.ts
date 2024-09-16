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
  table: string;
  schema?: string;
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
      formatterParams: { relativeToPage: true },
      contextMenu: (_e, cell) => {
        return copyActionsMenu({ ranges: cell.getRanges(), table, schema });
      },
      headerContextMenu: (_e, column) => {
        return [
          ...copyActionsMenu({
            ranges: column.getTable().getRanges(),
            table,
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
  return new TabulatorFull(el, mergedOptions);
}
