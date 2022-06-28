import { SchemaItem, TableKey } from "@shared/lib/dialects/models";

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

export interface DatabaseEntity {
  schema?: string;
  name: string;
  entityType: 'table' | 'view' | 'materialized-view' | 'routine'
}



export interface TableOrView extends DatabaseEntity {
  columns?: TableColumn[];
}

export interface IndexedColumn {
  name: string
  order: 'ASC' | 'DESC'
}

export interface TableIndex {
  id: string
  table: string
  schema: string
  name: string
  columns: IndexedColumn[]
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

export interface ExtendedTableColumn extends SchemaItem {
  ordinalPosition: number
  schemaName?: string
  tableName: string
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
  data: object[]
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
  columnType?: string;
  value: any;
}

export interface TableDelete {
  table: string;
  primaryKeys: PKSelector[]
  schema?: string;
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
