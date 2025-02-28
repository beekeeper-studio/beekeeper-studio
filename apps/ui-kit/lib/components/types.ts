export interface BaseColumn {
  /** The key of the column in the data array. */
  field: string;
  /** The data type of the column. */
  dataType?: string;
}

export type BaseData = Array<Record<string, any>>;

export interface BaseTable {
  name: string;
  schema?: string;
  columns?: BaseColumn[];
}
