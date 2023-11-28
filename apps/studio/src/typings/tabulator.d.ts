import { Tabulator } from "tabulator-tables";

declare module "tabulator-tables" {
  export namespace Tabulator {
    export class RangeComponent {
      getData(): Record<string, any>[];
      getElement(): HTMLElement;
      getCells(): Tabulator.CellComponent[];
      getRows(): Tabulator.RowComponent[];
      getColumns(): Tabulator.ColumnComponent[];
      getTop(): number;
      getBottom(): number;
    }

    export class CellComponent {
      getRange(): Tabulator.RangeComponent;
    }

    export class RowComponent {
      getRange(): Tabulator.RangeComponent;
    }

    export class ColumnComponent {
      getRange(): Tabulator.RangeComponent;
    }
  }
}
