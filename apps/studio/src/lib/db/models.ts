import { IndexColumn, SchemaItem, TableKey } from "@shared/lib/dialects/models";
import { BackupConfig } from "./models/BackupConfig";

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
  engine?: string
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
  permissionWarnings?: string[]
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
  generationExpression?: string
  characterSet?: string
  collation?: string
  array?: boolean
  bksField: BksField
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

  // surrealdb only
  namespace?: string;
}

export interface SchemaFilterOptions {
  database?: string;
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
  fields: BksField[];
}

export interface BksField {
  name: string;
  bksType: BksFieldType;
}

export type BksFieldType = 'BINARY' | 'UNKNOWN' | 'OBJECTID' | 'SURREALID';

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

export type IncludedFilterTypes = 'standard' | 'ilike'

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
  transactions: boolean;
  filterTypes: IncludedFilterTypes[];
}

export interface FieldDescriptor {
  name: string;
  id: string;
  dataType?: string;
}

export interface NgQueryResult {
  output?: any;
  fields?: FieldDescriptor[];
  rows?: any[];
  rowCount?: number;
  affectedRows?: number;
  command?: any;
}

export type QueryResult = NgQueryResult[];

export interface CancelableQuery {
  execute: () => Promise<QueryResult>;
  cancel: () => Promise<void>;
}

// Backups
export interface SelectControlOption {
  name: string,
  value: string
}

export type BackupFormat = SelectControlOption

export interface SupportedBackupFeatures {
  selectObjects: boolean,
  settings: boolean,
}

export class Command {
  isSql: boolean;
  sql: string;
  env: any;
  mainCommand: string;
  options: string[];
  postCommand?: Command;

  constructor(value: Partial<Command>) {
    Object.assign(this, value);
  }
}

export class BackupTable {
  objectName: string;
  schemaName: string;
  included: boolean;

  constructor(value: Partial<BackupTable>) {
    Object.assign(this, value);
  }
}

export class BackupSchema {
  objectName: string;
  included: boolean;

  constructor(value: Partial<BackupSchema>) {
    Object.assign(this, value);
  }
}

export type ControlType = 'select' | 'checkbox' | 'filepicker' | 'input' | 'info' | 'textarea';

export interface CommandSettingControl {
  controlType: ControlType | ((config: BackupConfig) => ControlType);
  settingName?: string;
  settingDesc: string;
  required?: boolean;
  selectOptions?: SelectControlOption[];
  placeholder?: string;
  show?: (config: BackupConfig) => boolean;
  controlOptions?: any;
  valid?: (config: BackupConfig) => boolean;
  infoLink?: string;
  infoLinkText?: string;
  infoTitle?: string;
  onValueChange?: (config: BackupConfig) => void;
  actions?: CommandControlAction[];
}

export interface CommandControlAction {
  disabled: boolean | ((config: BackupConfig) => boolean);
  value?: string | ((config: BackupConfig) => string);
  icon?: string | ((config: BackupConfig) => string);
  onClick?: (config: BackupConfig) => void;
  show?: (config: BackupConfig) => boolean;
  tooltip?: string | ((config: BackupConfig) => string);
}

export interface CommandSettingSection {
  header: string;
  controls: CommandSettingControl[];
  show?: (config: BackupConfig) => boolean;
}

export interface ImportFuncOptions {
  clientExtras?: {[key: string]: any}
  executeOptions?: {[key: string]: any}
  importerOptions?: {[key: string]: any}
  storeValues?: {[key: string]: any}
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

export interface ServerStatistics {
  queryCache: {
    size: string;
    limit: string;
    hits: number;
    inserts: number;
    lowMemoryPrunes: number;
  };
  performance: {
    connections: number;
    uptime: number;
    threadsRunning: number;
    threadsConnected: number;
    slowQueries: number;
    questionsPerSecond: number;
  };
  memory: {
    keyBufferSize: string;
    innodbBufferPoolSize: string;
    innodbBufferPoolUsed: string;
  };
}
