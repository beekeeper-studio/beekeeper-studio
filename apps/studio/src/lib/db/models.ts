import { IndexColumn, SchemaItem, TableKey } from "@shared/lib/dialects/models";

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

export class NoOpCursor extends BeeCursor {
  async start(): Promise<void> {
    // yes
  }
  async read(): Promise<any[][]> {
    return []
  }
  async cancel(): Promise<void> {
    // yes
  }

}

export interface StreamResults {
  columns: TableColumn[],
  totalRows: number,
  cursor: BeeCursor
}

export interface DatabaseEntity {
  schema?: string;
  name: string;
  entityType: 'table' | 'view' | 'materialized-view' | 'routine'
}

export interface TableOrView extends DatabaseEntity {
  columns?: TableColumn[];
  partitions?: TablePartition[];
  tabletype?: string | null
  parenttype?: string | null
}

export interface TableIndex {
  id: string
  table: string
  schema: string
  name: string
  columns: IndexColumn[]
  unique: boolean
  primary: boolean
  nullsNotDistinct?: boolean // for postgres 15 and above https://www.postgresql.org/about/featurematrix/detail/392/
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

export interface TablePartition {
  name: string;
  schema: string;
  expression: string;
  num: number;
}

export interface TableProperties {
  description?: string
  size?: number
  indexSize?: number
  indexes: TableIndex[]
  relations: TableKey[]
  triggers: TableTrigger[]
  partitions?: TablePartition[]
  owner?: string,
  createdAt?: string
}

export interface TableColumn {
  columnName: string
  dataType: string
  schemaName?: string
  tableName?: string
}

export interface ExtendedTableColumn extends SchemaItem {
  ordinalPosition: number
  schemaName?: string
  tableName: string
  hasDefault?: boolean
  generated?: boolean
  array?: boolean
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
  value?: string | string[];
  op?: 'AND' | 'OR';
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
}

export interface TableChanges {
  inserts: TableInsert[];
  updates: TableUpdate[];
  deletes: TableDelete[];
}


// AlterTableSpec is in @shared

export interface TableInsert {
  table: string
  schema?: string
  dataset?: string
  data: Record<string, any>[]
}

export interface PKSelector {
  column: string
  value: any
}

export interface TableUpdate {
  table: string;
  column: string;
  primaryKeys: PKSelector[]
  schema?: string;
  // FIXME: Make this `dataType`, the same as we use for TableColumn
  dataset?: string
  columnType?: string;
  columnObject?: ExtendedTableColumn
  value: any;
}

export interface TableDelete {
  table: string;
  primaryKeys: PKSelector[]
  schema?: string;
  dataset?: string
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

export interface Routine extends DatabaseEntity {
  id: string;
  returnType: string;
  returnTypeLength?: number;
  routineParams?: RoutineParam[];
  pinned?: boolean;
  type: RoutineType;
}

// NOTE (day): note sure if this is really where we want to put edit partitions?
export interface SupportedFeatures {
  customRoutines: boolean;
  comments: boolean;
  properties: boolean;
  partitions: boolean;
  editPartitions: boolean;
  backups: boolean;
  // Some databases support a directory backup format.
  backDirFormat: boolean;
  restore: boolean;
  indexNullsNotDistinct: boolean; // for postgres 15 and above
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

export interface ImportScriptFunctions {
  step0?: (args?: any) => Promise<null|any>
  beginCommand: (args?: any) => Promise<null|any>
  truncateCommand: (args?: any) => Promise<null|any>
  lineReadCommand: (sql: string|string[], args?: any) => Promise<null|any>,
  commitCommand: (args?: any) => Promise<null|any>
  rollbackCommand: (args?: any) => Promise<null|any>
  finalCommand?: (args?: any) => Promise<any|null>
}

export interface BuildInsertOptions {
  columns?: any[],
  bitConversionFunc?: (value: any) => any
  runAsUpsert?: boolean
  primaryKeys?: string[]
  createUpsertFunc?: null | ((table: DatabaseEntity, data: {[key: string]: any}, primaryKey: string[]) => string)
}