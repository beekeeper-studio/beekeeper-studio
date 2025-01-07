import {
  Options as TabulatorOptions,
  TabulatorFull,
  ColumnDefinition,
} from "tabulator-tables";
import _ from "lodash";
import { HeaderSortTabulatorModule } from './plugins/HeaderSortTabulatorModule'
import { EventBridgeTabulatorModule } from './plugins/EventBridgeTabulatorModule'

export interface Options {
  rowHeaderOffset?: number | (() => number);
  rowHeaderContextMenu?: ColumnDefinition['contextMenu'];
  cornerHeaderContextMenu?: ColumnDefinition['headerContextMenu'];
}

export function tabulatorForTableData(
  el: string | HTMLElement,
  options: Options,
  tabulatorOptions: Partial<TabulatorOptions>
): TabulatorFull {
  const { rowHeaderOffset = 0 } = options;
  const defaultOptions: TabulatorOptions = {
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
    downloadConfig: {
      columnHeaders: true,
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
      // @ts-expect-error not fully typed
      formatter(cell) {
        const content = document.createElement("span");
        const row = cell.getRow();

        row.watchPosition((position: number) => {
          let offset = rowHeaderOffset as number;
          if (typeof rowHeaderOffset === "function") {
            offset = rowHeaderOffset();
          }
          content.innerText = (position + offset).toString();
        });

        return content;
      },
      ...(options.rowHeaderContextMenu && { contextMenu: options.rowHeaderContextMenu }),
      ...(options.cornerHeaderContextMenu && { headerContextMenu: options.cornerHeaderContextMenu }),
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
// FIXME we should be able to customize this
// TabulatorFull.defaultOptions.popupContainer = ".beekeeper-studio-wrapper";
TabulatorFull.defaultOptions.headerSortClickElement = 'icon';
TabulatorFull.registerModule([HeaderSortTabulatorModule, EventBridgeTabulatorModule]);
