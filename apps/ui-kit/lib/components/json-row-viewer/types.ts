export interface ExpandablePath {
  path: string[];
  tableKey: TableKey;
}

export interface TableKey {
  toTable: string;
  toSchema: string;
  toColumn: string;
  fromTable: string;
  fromSchema: string;
  fromColumn: string;
}
