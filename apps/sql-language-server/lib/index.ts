/**
 * Public host-side API for `@beekeeperstudio/sql-language-server`.
 *
 * Importing this module does NOT pull in the worker/server code — that ships
 * as a separate entry under `./worker`. Hosts:
 *
 *   1. `import { createSqlLanguageServer, SchemaProvider } from "@beekeeperstudio/sql-language-server"`.
 *   2. Spawn the worker themselves.
 *   3. Wire it to their LSP client.
 */
export { createSqlLanguageServer } from "./client/createWorker";
export type {
  CreateSqlLanguageServerOptions,
  SqlLanguageServerHandle,
} from "./client/createWorker";

export { HostSchemaBridge } from "./client/HostSchemaBridge";

export type {
  SchemaProvider,
  TableInfo,
  ColumnInfo,
} from "./server/schema/SchemaProvider";

export type { Dialect } from "./server/parsing/dialects";

// Custom message method names (for hosts that hand-roll a JSON-RPC bridge).
export {
  GetSchemasMethod,
  GetTablesMethod,
  GetColumnsMethod,
  GetDefaultSchemaMethod,
  InvalidateSchemaMethod,
} from "./server/schema/messages";

// Param/result interfaces.
export type {
  GetTablesParams,
  GetTablesResult,
  GetColumnsParams,
  GetColumnsResult,
  GetSchemasResult,
  GetDefaultSchemaResult,
  InvalidateSchemaParams,
} from "./server/schema/messages";
