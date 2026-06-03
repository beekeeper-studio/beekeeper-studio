export type ThemeType = "dark" | "light";

export interface QueryResult {
  fields: {
    id: string;
    name: string;
    dataType?: string;
  }[];
  rows: Record<string, unknown>[];
}

export interface TableKey {
  isComposite: boolean;
  toTable: string;
  toSchema: string;
  toColumn: string | string[];
  fromTable: string;
  fromSchema: string;
  fromColumn: string | string[];
  constraintName?: string;
  onUpdate?: string;
  onDelete?: string;
}

export type IndexColumn = {
  name: string;
  order?:
    | "ASC"
    | "DESC"
    | "2d"
    | "2dsphere"
    | "text"
    | "geoHaystack"
    | "hashed"
    | number; // after DESC is for mongo only
  /** MySQL Only */
  prefix?: number | null;
};

export type PrimaryKey = {
  columnName: string;
  position: number;
};

export type TableIndex = {
  id: string;
  table: string;
  schema: string;
  name: string;
  columns: IndexColumn[];
  unique: boolean;
  primary: boolean;
  /** for postgres 15 and above https://www.postgresql.org/about/featurematrix/detail/392/ */
  nullsNotDistinct?: boolean;
};

export type Table = {
  name: string;
  schema?: string;
};

export type Column = {
  name: string;
  type: string;
};

export type WindowEventClass =
  | "MouseEvent"
  | "KeyboardEvent"
  | "PointerEvent"
  | "Event";

export type WindowEventInits =
  | MouseEventInit
  | KeyboardEventInit
  | PointerEventInit;

export type TableFilter = {
  field: string;
  type:
    | "="
    | "!="
    | "like"
    | "not like"
    | "<"
    | "<="
    | ">"
    | ">="
    | "in"
    | "is"
    | "is not";
  value?: string | string[];
  op?: "AND" | "OR";
};

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ActiveRange = {
  rows: number[];
  columns: string[];
  value: JsonValue[][];
};

export type CellMenuTarget = {
  type: "cell";
  row: number;
  column: string;
  value: JsonValue;
};

export type ColumnMenuTarget = {
  type: "column";
  column: string;
  rows: number[];
  value: JsonValue[];
};

export type RowMenuTarget = {
  type: "row";
  row: number;
  columns: string[];
  value: JsonValue[];
};

export type CornerMenuTarget = {
  type: "corner";
  rows: number[];
  columns: string[];
  value: JsonValue[][];
};

export type CellMenuParams = {
  target: CellMenuTarget;
  activeRange: ActiveRange;
};

export type ColumnMenuParams = {
  target: ColumnMenuTarget;
  activeRange: ActiveRange;
};

export type RowMenuParams = { target: RowMenuTarget; activeRange: ActiveRange };

export type CornerMenuParams = {
  target: CornerMenuTarget;
  activeRange: ActiveRange;
};

export type LoadViewParams =
  | CornerMenuParams
  | RowMenuParams
  | ColumnMenuParams
  | CellMenuParams;

export type PluginViewContext = {
  command: string;
  params?: CellMenuParams | ColumnMenuParams | RowMenuParams | CornerMenuParams;
};

export type DatabaseType =
  | "postgresql"
  | "mysql"
  | "mariadb"
  | "sqlite"
  | "sqlserver"
  | "oracle"
  | "mongodb"
  | "cassandra"
  | "clickhouse"
  | "firebird"
  | "bigquery"
  | "redshift"
  | "duckdb"
  | "libsql"
  | "redis"
  | "surrealdb"
  | "trino"
  | "snowflake";

export type ConnectionInfo = {
  /** @alias databaseType */
  connectionType: string;
  /** The ID of the connection */
  id: number;
  /** The name of the connection specified in the connection form */
  workspaceId: number;
  /** The name of the connection specified in the connection form */
  connectionName: string;
  databaseType: DatabaseType;
  /** The name of the database connected to */
  databaseName: string;
  defaultSchema?: string;
  readOnlyMode: boolean;
};

export type AppInfo = {
  version: string;
  theme: AppTheme;
};

export type AppTheme = {
  palette: Record<string, string>;
  cssString: string;
  type: ThemeType;
};

export type RunQueryResult = {
  results: QueryResult[];
  error?: unknown;
};

export type OpenQueryTabOptions = {
  query?: string;
};

export type OpenTableTableTabOptions = {
  table: string;
  schema?: string;
  filters?: TableFilter[];
  database?: string;
};

export type OpenTableStructureTabOptions = {
  table: string;
  schema?: string;
  database?: string;
};

export type RequestFileSaveOptions = {
  data: string;
  fileName: string;
  /** @default "utf8" */
  encoding?: "utf8" | "base64";
  filters?: { name: string; extensions: string[] }[];
};

export type PluginErrorObject = {
  name: string;
  message: string;
  stack?: string;
  logStack: string;
};

export type WindowEventObject = {
  eventType: string;
  eventClass: WindowEventClass;
  eventInitOptions: WindowEventInits;
};

export type ConfirmOptions = {
  confirmLabel?: string;
  cancelLabel?: string;
};

export type WorkspaceInfo = {
  id: number;
  type: "local" | "cloud";
  name: string;
  isOwner: boolean;
};
