import { Connection } from "vscode-languageserver/browser";
import { ColumnInfo, TableInfo } from "./SchemaProvider";
import {
  GetColumnsMethod,
  GetColumnsParams,
  GetColumnsResult,
  GetDefaultSchemaMethod,
  GetDefaultSchemaResult,
  GetSchemasMethod,
  GetSchemasResult,
  GetTablesMethod,
  GetTablesParams,
  GetTablesResult,
  InvalidateSchemaMethod,
  InvalidateSchemaParams,
} from "./messages";

/**
 * In-memory cache of schema information, populated on demand by asking the
 * host via custom LSP requests. The worker never holds an actual
 * SchemaProvider instance — it only exchanges JSON-RPC messages with the
 * host that owns one.
 *
 * Invalidation is host-driven: the host sends `bks/schema/invalidate` when
 * the underlying schema changes (DDL executed, connection switched, etc.).
 */
export class SchemaCache {
  private schemas: string[] | undefined;
  private tablesBySchema = new Map<string, TableInfo[]>();
  private columnsByTable = new Map<string, ColumnInfo[]>();
  private defaultSchema: string | null | undefined;

  constructor(private connection: Connection) {
    connection.onNotification(
      InvalidateSchemaMethod,
      (params: InvalidateSchemaParams | undefined) => {
        if (
          !params ||
          (params.table === undefined && params.schema === undefined)
        ) {
          this.clear();
          return;
        }
        if (params.table) {
          this.columnsByTable.delete(tableKey(params.table, params.schema));
        } else if (params.schema) {
          this.tablesBySchema.delete(params.schema);
          for (const key of [...this.columnsByTable.keys()]) {
            if (key.startsWith(`${params.schema}::`)) {
              this.columnsByTable.delete(key);
            }
          }
        }
      }
    );
  }

  clear(): void {
    this.schemas = undefined;
    this.tablesBySchema.clear();
    this.columnsByTable.clear();
    this.defaultSchema = undefined;
  }

  async getSchemas(): Promise<string[]> {
    if (this.schemas !== undefined) return this.schemas;
    try {
      const r = await this.connection.sendRequest<GetSchemasResult>(
        GetSchemasMethod
      );
      this.schemas = r?.schemas ?? [];
    } catch {
      this.schemas = [];
    }
    return this.schemas;
  }

  async getTables(schema?: string): Promise<TableInfo[]> {
    const key = schema ?? "__default__";
    const cached = this.tablesBySchema.get(key);
    if (cached) return cached;
    try {
      const r = await this.connection.sendRequest<GetTablesResult>(
        GetTablesMethod,
        { schema } as GetTablesParams
      );
      const tables = r?.tables ?? [];
      this.tablesBySchema.set(key, tables);
      return tables;
    } catch {
      this.tablesBySchema.set(key, []);
      return [];
    }
  }

  async getColumns(table: string, schema?: string): Promise<ColumnInfo[]> {
    const key = tableKey(table, schema);
    const cached = this.columnsByTable.get(key);
    if (cached) return cached;
    try {
      const r = await this.connection.sendRequest<GetColumnsResult>(
        GetColumnsMethod,
        { table, schema } as GetColumnsParams
      );
      const columns = r?.columns ?? [];
      this.columnsByTable.set(key, columns);
      return columns;
    } catch {
      this.columnsByTable.set(key, []);
      return [];
    }
  }

  async getDefaultSchema(): Promise<string | undefined> {
    if (this.defaultSchema !== undefined) {
      return this.defaultSchema ?? undefined;
    }
    try {
      const r = await this.connection.sendRequest<GetDefaultSchemaResult>(
        GetDefaultSchemaMethod
      );
      this.defaultSchema = r?.schema ?? null;
      return this.defaultSchema ?? undefined;
    } catch {
      this.defaultSchema = null;
      return undefined;
    }
  }
}

function tableKey(table: string, schema?: string): string {
  return `${schema ?? ""}::${table}`;
}
