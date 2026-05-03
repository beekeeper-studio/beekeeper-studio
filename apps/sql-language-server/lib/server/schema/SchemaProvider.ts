/**
 * The host-pluggable abstraction for fetching database metadata.
 *
 * The language server is intentionally agnostic about *how* schema information
 * is sourced. A host (Beekeeper Studio renderer, a web playground, tests) is
 * expected to implement this interface and pass it to `createSqlLanguageServer`.
 * Inside the worker, requests are answered via custom LSP messages
 * (see `./messages.ts`).
 */

export interface ColumnInfo {
  name: string;
  /** Database type as reported by the host, e.g. "varchar(255)". Optional. */
  dataType?: string;
  /** True if the column is nullable. Optional. */
  nullable?: boolean;
  /** True if the column is a primary key member. Optional. */
  primaryKey?: boolean;
}

export interface TableInfo {
  name: string;
  schema?: string;
  /** "table" | "view" | "materialized-view" — host-defined; informational only. */
  kind?: string;
}

export interface SchemaProvider {
  /** Return all schema/database names. May be empty for engines without schemas (e.g. SQLite). */
  getSchemas(): Promise<string[]>;
  /** Return tables/views for a given schema, or for the default schema if omitted. */
  getTables(schema?: string): Promise<TableInfo[]>;
  /** Return columns for a fully-qualified table. */
  getColumns(table: string, schema?: string): Promise<ColumnInfo[]>;
  /** Optional: the schema considered "default" for unqualified references. */
  getDefaultSchema?(): Promise<string | undefined>;
}
