import type { StatementType } from "sql-query-identifier";

/** Hard cap on the number of rows a single `runQuery` result returns. */
export const MAX_QUERY_ROWS = 20000;

export const METHODS = [
  "getConnections",
  "getSchemas",
  "getEntities",
  "getTableStructure",
  "runQuery",
  "openTab",
  "switchTab",
  "getSavedQueries",
  "getSavedQuery",
  "createSavedQuery",
  "updateSavedQuery",
  "requestApproval",
] as const;

export type MethodName = (typeof METHODS)[number];

export const ENTITY_TYPES = [
  "table",
  "view",
  "materialized-view",
  "routine",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const TAB_TYPES = ["query"] as const;

export type TabType = (typeof TAB_TYPES)[number];

export type QueryPermission = StatementType | "ANYTHING";

/**
 * Every permission the approval dialog offers. Transaction control (BEGIN,
 * COMMIT, ROLLBACK) needs none, so it is not listed.
 */
// prettier-ignore
export const QUERY_PERMISSIONS: readonly QueryPermission[] = [
  "INSERT", "UPDATE", "DELETE", "SELECT", "SELECT_INTO", "TRUNCATE",
  "CREATE_DATABASE", "CREATE_SCHEMA", "CREATE_TABLE", "CREATE_VIEW",
  "CREATE_TRIGGER", "CREATE_FUNCTION", "CREATE_INDEX", "CREATE_PROCEDURE",
  "SHOW_BINARY", "SHOW_BINLOG", "SHOW_CHARACTER", "SHOW_COLLATION",
  "SHOW_CREATE", "SHOW_ENGINE", "SHOW_ENGINES", "SHOW_ERRORS", "SHOW_EVENTS",
  "SHOW_FUNCTION", "SHOW_GRANTS", "SHOW_MASTER", "SHOW_OPEN", "SHOW_PLUGINS",
  "SHOW_PRIVILEGES", "SHOW_PROCEDURE", "SHOW_PROCESSLIST", "SHOW_PROFILE",
  "SHOW_PROFILES", "SHOW_RELAYLOG", "SHOW_REPLICAS", "SHOW_SLAVE",
  "SHOW_REPLICA", "SHOW_STATUS", "SHOW_TRIGGERS", "SHOW_VARIABLES",
  "SHOW_WARNINGS", "SHOW_DATABASES", "SHOW_KEYS", "SHOW_INDEX", "SHOW_TABLE",
  "SHOW_WAREHOUSES", "SHOW_USERS", "SHOW_ROLES", "SHOW_SCHEMAS", "SHOW_STAGES",
  "SHOW_INTEGRATIONS", "SHOW_STREAMS", "SHOW_TASKS", "SHOW_PIPES",
  "SHOW_SEQUENCES", "SHOW_TABLES", "SHOW_COLUMNS", "DROP_DATABASE",
  "DROP_SCHEMA", "DROP_TABLE", "DROP_VIEW", "DROP_TRIGGER", "DROP_FUNCTION",
  "DROP_INDEX", "DROP_PROCEDURE", "ALTER_DATABASE", "ALTER_SCHEMA",
  "ALTER_TABLE", "ALTER_VIEW", "ALTER_TRIGGER", "ALTER_FUNCTION", "ALTER_INDEX",
  "ALTER_PROCEDURE", "ANON_BLOCK", "MERGE", "CALL", "GRANT", "REVOKE",
  "EXPLAIN", "DESCRIBE", "USE", "COPY", "PUT", "GET", "LIST", "REMOVE",
  "UNKNOWN", "ANYTHING",
];

// Statements that only read; a read only connection grants nothing else.
// prettier-ignore
const READ_QUERY_PERMISSIONS: readonly QueryPermission[] = [
  "SELECT", "EXPLAIN", "DESCRIBE", "USE", "LIST", "GET", "SHOW_BINARY",
  "SHOW_BINLOG", "SHOW_CHARACTER", "SHOW_COLLATION", "SHOW_CREATE",
  "SHOW_ENGINE", "SHOW_ENGINES", "SHOW_ERRORS", "SHOW_EVENTS", "SHOW_FUNCTION",
  "SHOW_GRANTS", "SHOW_MASTER", "SHOW_OPEN", "SHOW_PLUGINS", "SHOW_PRIVILEGES",
  "SHOW_PROCEDURE", "SHOW_PROCESSLIST", "SHOW_PROFILE", "SHOW_PROFILES",
  "SHOW_RELAYLOG", "SHOW_REPLICAS", "SHOW_SLAVE", "SHOW_REPLICA", "SHOW_STATUS",
  "SHOW_TRIGGERS", "SHOW_VARIABLES", "SHOW_WARNINGS", "SHOW_DATABASES",
  "SHOW_KEYS", "SHOW_INDEX", "SHOW_TABLE", "SHOW_WAREHOUSES", "SHOW_USERS",
  "SHOW_ROLES", "SHOW_SCHEMAS", "SHOW_STAGES", "SHOW_INTEGRATIONS",
  "SHOW_STREAMS", "SHOW_TASKS", "SHOW_PIPES", "SHOW_SEQUENCES", "SHOW_TABLES",
  "SHOW_COLUMNS",
];

/** The query permissions that can change data or schema; a read only connection never grants them. */
export const WRITE_QUERY_PERMISSIONS: readonly QueryPermission[] =
  QUERY_PERMISSIONS.filter((type) => !READ_QUERY_PERMISSIONS.includes(type));

/** What the user approved a client to do on one connection. Schemas and structure are always allowed. */
export interface Access {
  queryTypes: QueryPermission[];
  savedQueriesRead: boolean;
  savedQueriesWrite: boolean;
  openTabs: boolean;
}

/** Who is calling, as the bks command detected it. */
export interface ClientInfo {
  name: string;
}

/** What the approval dialog shows. */
export interface ApprovalRequester {
  clientName: string;
  connectionName: string;
  readOnlyMode: boolean;
}

export interface ConnectionsParams { }

export interface ConnectionsResult {
  connections: OpenConnection[];
}

export interface SchemasParams {
  /** Name or id of the open connection to use. Optional when only one connection is open or approved. */
  connection?: string;
}

export interface SchemasResult {
  schemas: string[];
}

export interface EntitiesParams {
  connection?: string;
  schema?: string;
  /** Defaults to every type. */
  entityTypes?: EntityType[];
}

export interface EntitiesResult {
  schema?: string;
  entities: Entity[];
  warnings: string[];
}

export interface StructureParams {
  connection?: string;
  /** Table or view name. */
  name: string;
  schema?: string;
}

export interface StructureResult {
  schema?: string;
  name: string;
  entityType: EntityType;
  description: string | null;
  columns: Column[];
  primaryKeys: string[];
  indexes: Index[];
  relations: ForeignKey[];
  triggers: Trigger[];
  partitions: Partition[];
  size: number | null;
  indexSize: number | null;
  owner: string | null;
  createdAt: string | null;
  createScript: string | null;
  warnings: string[];
}

export interface OpenTabParams {
  connection?: string;
  tab: TabType;
  /** SQL to prefill a query tab with. */
  sql?: string;
}

export interface OpenTabResult {
  tabId: number;
}

export interface QueryParams {
  connection?: string;
  sql: string;
}

export interface QueryResult {
  results: StatementResult[];
}

export interface SwitchTabParams {
  connection?: string;
  tabId: number;
}

export interface RequestApprovalParams {
  connection?: string;
}

export interface RequestApprovalResult {
  /** False when the client was approved before and no dialog was shown. */
  newlyApproved: boolean;
  access: Access;
}

export interface SavedQueriesParams {
  connection?: string;
}

export interface SavedQuerySummary {
  id: number;
  title: string;
  excerpt: string;
  folderId: number | null;
  updatedAt: string | null;
}

export interface SavedQuery extends SavedQuerySummary {
  text: string;
}

export interface SavedQueriesResult {
  savedQueries: SavedQuerySummary[];
}

export interface SavedQueryParams {
  connection?: string;
  id: number;
}

export interface SavedQueryResult {
  savedQuery: SavedQuery;
}

export interface CreateSavedQueryParams {
  connection?: string;
  title: string;
  text: string;
}

export interface UpdateSavedQueryParams {
  connection?: string;
  id: number;
  title?: string;
  text?: string;
}

/** The app's CLI methods, by name: what each takes and returns. */
export interface Methods {
  getConnections: (params: ConnectionsParams) => ConnectionsResult;
  getSchemas: (params: SchemasParams) => SchemasResult;
  getEntities: (params: EntitiesParams) => EntitiesResult;
  getTableStructure: (params: StructureParams) => StructureResult;
  runQuery: (params: QueryParams) => QueryResult;
  openTab: (params: OpenTabParams) => OpenTabResult;
  switchTab: (params: SwitchTabParams) => void;
  getSavedQueries: (params: SavedQueriesParams) => SavedQueriesResult;
  getSavedQuery: (params: SavedQueryParams) => SavedQueryResult;
  createSavedQuery: (params: CreateSavedQueryParams) => SavedQueryResult;
  updateSavedQuery: (params: UpdateSavedQueryParams) => void;
  requestApproval: (params: RequestApprovalParams) => RequestApprovalResult;
}

/** What the renderer is asked to open. */
export interface CreateTabRequest {
  tab: TabType;
  sql?: string;
}

export interface Request {
  /** Missing from clients older than ids on the wire. */
  id?: string;
  name: string;
  args: unknown;
  /** Missing from clients older than per-client approval. */
  client?: ClientInfo;
}

export interface RequestOptions {
  /** Id for this request, so it can be cancelled with cancel(). Generated when left out. */
  id?: string;
  signal?: AbortSignal;
}

export type Method = (...args: unknown[]) => unknown;

/** What RpcServer passes to a handler after its args. */
export interface CallContext {
  /** Aborted when the request is cancelled. */
  signal: AbortSignal;
  /** The request being handled. Missing for notifications. */
  request?: Request;
}

/** Electron's MessagePortMain, which emits Node-style events. */
export interface NodeMessagePort {
  postMessage(message: unknown): void;
  addListener(event: "message", listener: (event: { data: any }) => void): unknown;
  removeListener(
    event: "message",
    listener: (event: { data: any }) => void,
  ): unknown;
}

export type Port = MessagePort | NodeMessagePort;

/** A one-way message to a named handler. Nothing is sent back. */
export interface Notification {
  name: string;
  args: unknown;
}

/** What travels over the socket or port: one of these per line or post. */
export type Message =
  | { type: "request"; input: Request }
  | { type: "notification"; input: Notification }
  | { type: "response"; input: Reply };

export type ErrorCode =
  | "USAGE"
  | "NOT_RUNNING"
  | "NO_OPEN_CONNECTIONS"
  | "NOT_APPROVED"
  | "ACCESS_DENIED"
  | "NOT_PERMITTED"
  | "UNKNOWN_CONNECTION"
  | "AMBIGUOUS_CONNECTION"
  | "NOT_FOUND"
  | "AMBIGUOUS_ENTITY"
  | "READ_ONLY"
  | "QUERY_FAILED"
  | "INTERNAL";

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  /** What to do about it. Written for whoever (or whatever) reads the terminal. */
  hint?: string;
  details?: unknown;
}

export type Reply = {
  /** Null when the request could not be parsed. */
  id: string | null;
  type: "reply" | "error";
  data?: unknown;
  error?: string;
  errorName?: string;
  errorCode?: ErrorCode;
  errorHint?: string;
  errorDetail?: unknown;
  stack?: string;
};

/** Thrown when a request was cancelled before it finished. */
export class CancelError extends Error {
  constructor(
    readonly requestId: string,
    message = "The request was cancelled.",
  ) {
    super(message);
    this.name = "CancelError";
  }
}

export class CliError extends Error {
  code: ErrorCode;
  hint?: string;
  details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    options: { hint?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.hint = options.hint;
    this.details = options.details;
  }

  toPayload(): ErrorPayload {
    const payload: ErrorPayload = { code: this.code, message: this.message };
    if (this.hint) payload.hint = this.hint;
    if (this.details !== undefined) payload.details = this.details;
    return payload;
  }
}

/** Whether `value` is a CliError. */
export function isCliError(value: unknown): value is CliError {
  return value instanceof CliError || (value as any)?.name === "CliError";
}

/** One open connection as reported by the `connections` command. */
export interface OpenConnection {
  /** Stable for the lifetime of the renderer that owns the connection. */
  id: string;
  name: string;
  connectionType: string;
  defaultDatabase?: string;
  readOnlyMode: boolean;
  /** Whether the calling client has been approved for this connection. */
  approved: boolean;
}

export interface Entity {
  schema?: string;
  name: string;
  entityType: EntityType;
  /** Routines only: function, procedure, ... */
  routineType?: string;
  returnType?: string;
}

export interface Column {
  name: string;
  dataType: string;
  nullable?: boolean;
  defaultValue?: string | null;
  primaryKey?: boolean;
  comment?: string;
  ordinalPosition?: number;
  generated?: boolean;
  array?: boolean;
  enumValues?: string[];
}

/** A binary cell value, which JSON has no type for. */
export interface BinaryValue {
  type: "binary";
  encoding: "hex";
  data: string;
}

export interface StatementResult {
  command: string | null;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  totalRowCount: number;
  truncated: boolean;
  /** The row cap that applied, so a truncated result is self-explanatory. */
  maxRows: number;
  affectedRows: number | null;
}

export interface IndexColumn {
  name: string;
  order?: string | number;
  prefix?: number | null;
}

export interface Index {
  id: string;
  table: string;
  schema: string;
  name: string;
  columns: IndexColumn[];
  unique: boolean;
  primary: boolean;
  nullsNotDistinct?: boolean;
}

export interface ForeignKey {
  constraintName?: string;
  fromSchema: string;
  fromTable: string;
  fromColumn: string | string[];
  toSchema: string;
  toTable: string;
  toColumn: string | string[];
  onUpdate?: string;
  onDelete?: string;
  isComposite: boolean;
}

export interface Trigger {
  name: string;
  timing: string;
  manipulation: string;
  action: string;
  condition: string | null;
  table: string;
  schema?: string;
}

export interface Partition {
  name: string;
  schema: string;
  expression: string;
  num: number;
}
