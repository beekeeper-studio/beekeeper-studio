import type { ColumnDefinition } from "tabulator-tables";
import { BaseColumn } from "../types";

export interface Column extends BaseColumn {
  /** The title of the column displayed in the table header. */
  title: string;
  /** Make the column editable. */
  editable?: boolean;
  /** Make the column a primary key. */
  primaryKey?: boolean;
  /** Make the column a foreign key. TODO add object type */
  foreignKey?: boolean;
  /** Make the column a generated column. */
  generated?: boolean;
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
