import { ColumnInfo, TableInfo } from "./SchemaProvider";

/**
 * Custom LSP messages used to bridge the worker to the host's
 * SchemaProvider. The worker sends requests; the host answers them by
 * delegating to its SchemaProvider implementation.
 *
 * We use plain method-name strings (rather than `RequestType` objects) to
 * avoid TypeScript type-identity issues between competing copies of
 * `vscode-jsonrpc` that can appear in `node_modules` when both
 * `vscode-languageserver` (server side) and `vscode-jsonrpc/browser`
 * (host bridge) are installed. Method names use a `bks/` prefix to avoid
 * collision with future LSP additions.
 */

export const GetSchemasMethod = "bks/schema/getSchemas";
export const GetTablesMethod = "bks/schema/getTables";
export const GetColumnsMethod = "bks/schema/getColumns";
export const GetDefaultSchemaMethod = "bks/schema/getDefaultSchema";
export const InvalidateSchemaMethod = "bks/schema/invalidate";

// --- Request/response shapes ------------------------------------------------

export interface GetSchemasResult {
  schemas: string[];
}

export interface GetTablesParams {
  schema?: string;
}
export interface GetTablesResult {
  tables: TableInfo[];
}

export interface GetColumnsParams {
  table: string;
  schema?: string;
}
export interface GetColumnsResult {
  columns: ColumnInfo[];
}

export interface GetDefaultSchemaResult {
  schema?: string;
}

/**
 * Host -> worker. Tells the worker to drop its cache so the next completion
 * round-trip refetches from the host. Use this on connection change, schema
 * mutation, etc.
 */
export interface InvalidateSchemaParams {
  /** Optional: drop only the entry for this table. If omitted, drop all. */
  table?: string;
  schema?: string;
}
