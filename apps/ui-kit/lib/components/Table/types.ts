import type { ColumnDefinition } from "tabulator-tables";

export interface Column {
  /** The key of the column in the data array. */
  field: string;
  /** The title of the column displayed in the table header. */
  title: string;
  dataType?: string;
  /** The CSS class to apply to the column. */
  cssClass?: string;
  tabulatorColumnDefinition?: Partial<ColumnDefinition> | ((def :ColumnDefinition) => ColumnDefinition)
}

