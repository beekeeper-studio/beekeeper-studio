import type { ColumnDefinition } from "tabulator-tables";

export interface Column {
  /** The key of the column in the data array. */
  field: string;
  /** The title of the column displayed in the table header. */
  title: string;
  /** Make the column editable. */
  editable?: boolean;
  /** The data type of the column. */
  dataType?: string;
  /** The CSS class to apply to the column. */
  cssClass?: string;
  /** By default, the table will guess which sorter to use based on the data of the first row.
   * If you want to force a specific sorter, you can specify it here.
   *
   * @see {@link https://tabulator.info/docs/6.3/sort#events} for available sorters.
   *
   * In additional to the built-in sorters, if set to `none`, the table will not perform sorting
   * on this column, but it will still display the sort icon, and send the event.
   * */
  sorter?: ColumnDefinition['sorter'] | 'none';
  /** Extend the default column definition. If object is provided, it will be shallow merged
   * with the default column definition. If function is provided, it will be called with the
   * default column definition as argument. The function should return the column definition. */
  tabulatorColumnDefinition?: Partial<ColumnDefinition> | ((def :ColumnDefinition) => ColumnDefinition)
}

export interface OrderBy {
  dir: 'ASC' | 'DESC';
  field: string;
}
