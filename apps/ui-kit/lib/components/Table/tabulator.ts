import {
  Options as TabulatorOptions,
  TabulatorFull,
} from "tabulator-tables";
import {
  copyActionsMenu,
  resizeAllColumnsToFitContent,
  resizeAllColumnsToFixedWidth,
} from "./menu";
import _ from "lodash";
import { HeaderSortTabulatorModule } from './plugins/HeaderSortTabulatorModule'
import { KeyListenerTabulatorModule } from './plugins/KeyListenerTabulatorModule'

interface Options extends Partial<TabulatorOptions> {
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
      // @ts-expect-error not fully typed
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

export function stringifyRangeData(rangeData: Record<string, any>[]) {
  const transformedRangeData:Record<string, any>[]  = [];

  for (let i = 0; i < rangeData.length; i++) {
    const keys = Object.keys(rangeData[i]);

    transformedRangeData[i] = {};

    for (const key of keys) {
      const value = rangeData[i][key];
      transformedRangeData[i][key] =
        value && typeof value === "object" ? JSON.stringify(value) : value;
    }
  }

  return transformedRangeData;
}

export const rowHeaderField = '--row-header--bks';

TabulatorFull.defaultOptions.layout = "fitDataFill";
TabulatorFull.defaultOptions.popupContainer = ".beekeeper-studio-wrapper";
TabulatorFull.defaultOptions.headerSortClickElement = 'icon';
TabulatorFull.registerModule([HeaderSortTabulatorModule, KeyListenerTabulatorModule]);
