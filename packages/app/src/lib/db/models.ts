


export abstract class BeeCursor {
  constructor(public chunkSize: number) {

  }
  abstract start(): Promise<void>
  abstract read(): Promise<any[][]>
  abstract cancel(): Promise<void>
  async close() {
    await this.cancel()
  }
}

export interface StreamResults {
  columns: TableColumn[],
  totalRows: number,
  cursor: BeeCursor
}




export interface TableOrView {
  schema: string;
  name: string;
  entityType?: 'table' | 'view' | 'materialized-view';
  columns?: TableColumn[];
}

export interface TableIndex {
  id: string
  table: string
  schema: string
  name: string
  columns: string,
  unique: boolean
  primary: boolean  
}

export interface TableTrigger {
  name: string
  timing: string
  manipulation: string
  action: string
  condition: string | null
  table: string
  schema?: string
}

export interface TableProperties {
  description?: string
  size?: number
  indexSize?: number
  length: number
  indexes: TableIndex[]
  relations: TableKey[]
  triggers: TableTrigger[]
  owner?: string,
  createdAt?: string
}

export interface TableColumn {
  columnName: string
  dataType: string
  schemaName?: string
  tableName?: string
}

export interface ExtendedTableColumn extends TableColumn {
  ordinalPosition: number
  nullable: boolean
  defaultValue: any
}

export interface PrimaryKeyColumn {
  columnName: string,
  position: number
}

export interface FilterOptions {
  schema: Nullable<string>;
  only?: string[];
  ignore?: string[];
  tables?: string[];
}

export interface DatabaseFilterOptions {
  database?: string;
  only?: string[];
  ignore?: string[];
}

export interface SchemaFilterOptions {
  schema?: string;
  only?: string[];
  ignore?: string[];
}

export interface OrderBy {
  dir: 'ASC' | 'DESC';
  field: string;
}

export interface TableFilter {
  field: string;
  type: string;
  value: string;
}

export interface IDbInsertValue {
  column: TableColumn[];
  value: string;
}

export interface IDbInsert {
  table: string;
  values: IDbInsertValue[];
}

export interface TableResult {
  result: any[];
  fields: string[];
  totalRecords: Number;
}

export interface TableChanges {
  inserts: TableInsert[];
  updates: TableUpdate[];
  deletes: TableDelete[];
}


export interface ColumnChange {
  table: string
  schema?: string
  changeType: 'columnName' | 'dataType' | 'nullable' | 'defaultValue'
  columnName: string
  newValue: string | boolean
}

export interface TableInsert {
  table: string;
  schema?: string
  data: object[];
}

export interface TableUpdate {
  table: string;
  column: string;
  pkColumn: string;
  primaryKey: any;
  schema?: string;
  columnType?: string;
  value: any;
}

export interface TableDelete {
  table: string;
  pkColumn: string;
  schema?: string;
  primaryKey: string;
}

export interface TableKey {
  toTable: string;
  toSchema: string;
  toColumn: string;
  fromTable: string;
  fromSchema: string;
  fromColumn: string;
  constraintName: string;
  onUpdate?: string;
  onDelete?: string;
}

export type TableUpdateResult = any;

export interface RoutineParam {
  name: string;
  type: string;
  length?: number;
}
// TODO (matthew): Currently only supporting function and procedure

export type RoutineType = 'function' | 'window' | 'aggregate' | 'procedure';

export const RoutineTypeNames = {
  'function': "Function",
  'window': "Window Function",
  'aggregate': "Aggregate Function",
  'procedure': "Stored Procedure"
};

export interface Routine {
  id: string;
  schema?: string;
  name: string;
  returnType: string;
  returnTypeLength?: number;
  routineParams?: RoutineParam[];
  pinned?: boolean;
  type: RoutineType;
}

export interface SupportedFeatures {
  customRoutines: boolean;
  comments: boolean;
  properties: boolean;
}

export interface FieldDescriptor {
  name: string;
  id: string;
  dataType?: string;
}

export interface NgQueryResult {
  fields: FieldDescriptor[];
  rows: any[];
  rowCount?: number;
  affectedRows?: number;
  command?: any;
}

export type QueryResult = NgQueryResult[];

export interface CancelableQuery {
  execute: () => Promise<QueryResult>;
  cancel: () => Promise<void>;
}
