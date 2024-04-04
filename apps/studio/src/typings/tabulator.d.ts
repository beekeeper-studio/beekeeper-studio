import { Tabulator } from "tabulator-tables";


declare module "tabulator-tables" {
  export namespace Tabulator {
    export class RangeComponent {
      getData(): Record<string, any>[];
      getElement(): HTMLElement;
      getCells(): Tabulator.CellComponent[][];
      getRows(): Tabulator.RowComponent[];
      getColumns(): Tabulator.ColumnComponent[];
      getTopEdge(): number;
      getBottomEdge(): number;
      getLeftEdge(): number;
      getRightEdge(): number;
    }

    export class CellComponent {
      getRanges(): Tabulator.RangeComponent[];
    }

    export class RowComponent {
      getRanges(): Tabulator.RangeComponent[];
    }

    export class ColumnComponent {
      getRanges(): Tabulator.RangeComponent[];
      /**
       * Save column's state. Use this after changing width programmatically
       * (e.g. `setWidth`). See FullPersistence module.
       **/
      persistenceSave(): void;
    }
  }
}
