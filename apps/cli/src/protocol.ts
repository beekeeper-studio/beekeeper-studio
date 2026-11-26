/**
 * Shared types for the `beekeeper-studio cli` interface.
 *
 * The CLI is a thin client. The Beekeeper Studio binary, started with `cli`
 * as its first argument, sends a single JSON request over a local socket to
 * the running app (the utility process, which owns the live database
 * connections) and prints the JSON reply. Both ends and the tests import this
 * file, so nothing in here may depend on electron.
 */

/** Hard cap on the number of rows a single `runQuery` result returns. */
export const CLI_MAX_QUERY_ROWS = 20000;

export const CLI_METHODS = [
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

export type CliMethodName = (typeof CLI_METHODS)[number];

export const CLI_ENTITY_TYPES = [
  "table",
  "view",
  "materialized-view",
  "routine",
] as const;

export type CliEntityType = (typeof CLI_ENTITY_TYPES)[number];

export const CLI_TAB_TYPES = ["query"] as const;

export type CliTabType = (typeof CLI_TAB_TYPES)[number];

/**
 * Statement kinds a client can be allowed to run. Anything that is not one of
 * the named kinds (INSERT, CREATE, DROP, ...) needs `anything`.
 */
export const CLI_QUERY_PERMISSIONS = [
  "select",
  "explain-analyze",
  "update",
  "delete",
  "alter",
  "anything",
] as const;

export type CliQueryPermission = (typeof CLI_QUERY_PERMISSIONS)[number];

/** The query permissions that can change data or schema; a read only connection never grants them. */
export const CLI_WRITE_QUERY_PERMISSIONS: readonly CliQueryPermission[] = [
  "update",
  "delete",
  "alter",
  "anything",
];

/** What the user approved a client to do on one connection. Schemas and structure are always allowed. */
export interface CliAccess {
  queryTypes: CliQueryPermission[];
  savedQueriesRead: boolean;
  savedQueriesWrite: boolean;
  openTabs: boolean;
}

/** Who is calling, as the bks command detected it. */
export interface CliClientInfo {
  name: string;
}

/** What the approval dialog shows. */
export interface ApprovalRequester {
  clientName: string;
  connectionName: string;
  readOnlyMode: boolean;
}

export interface ConnectionsParams {}

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
  entityTypes?: CliEntityType[];
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
  entityType: CliEntityType;
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

export interface CreateTabParams {
  connection?: string;
  tab: CliTabType;
  /** SQL to prefill a query tab with. */
  sql?: string;
}

export interface CreateTabResult {
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
  access: CliAccess;
}

export interface SavedQueriesParams {
  connection?: string;
}

export interface CliSavedQuerySummary {
  id: number;
  title: string;
  excerpt: string;
  folderId: number | null;
  updatedAt: string | null;
}

export interface CliSavedQuery extends CliSavedQuerySummary {
  text: string;
}

export interface SavedQueriesResult {
  savedQueries: CliSavedQuerySummary[];
}

export interface SavedQueryParams {
  connection?: string;
  id: number;
}

export interface SavedQueryResult {
  savedQuery: CliSavedQuery;
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

/** What the renderer is asked to open. */
export interface CliCreateTabRequest {
  tab: CliTabType;
  sql?: string;
}

export interface CliRequest {
  method: CliMethodName;
  params: unknown;
  /** Missing from clients older than per-client approval. */
  client?: CliClientInfo;
}

export type CliErrorCode =
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

export interface CliErrorPayload {
  code: CliErrorCode;
  message: string;
  /** What to do about it. Written for whoever (or whatever) reads the terminal. */
  hint?: string;
  details?: unknown;
}

export interface CliResultResponse {
  ok: true;
  result: unknown;
}

export interface CliErrorResponse {
  ok: false;
  error: CliErrorPayload;
}

export type CliResponse = CliResultResponse | CliErrorResponse;

export class CliError extends Error {
  code: CliErrorCode;
  hint?: string;
  details?: unknown;

  constructor(
    code: CliErrorCode,
    message: string,
    options: { hint?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.hint = options.hint;
    this.details = options.details;
  }

  toPayload(): CliErrorPayload {
    const payload: CliErrorPayload = { code: this.code, message: this.message };
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
  entityType: CliEntityType;
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
