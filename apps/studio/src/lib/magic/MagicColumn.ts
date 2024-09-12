import { CellComponent } from 'tabulator-tables';

// This tells us how to render the column in tabulator.

export interface MagicColumn {
  title: string;
  formatter?: ((cell: CellComponent, params: any, onRendered) => string) | string;
  formatterParams?: any
  cssClass?: string
  tableLink?: {
    toTable: string;
    toSchema?: string;
    toColumn?: string;
  };
}
