/**
 * A SchemaProvider implementation backed by a sql.js (in-browser SQLite)
 * database. Shared between the integration tests and the browser demo —
 * one implementation, two consumers, no Beekeeper-specific code.
 */

import type { Database } from "sql.js";
import type {
  ColumnInfo,
  SchemaProvider,
  TableInfo,
} from "../../lib/server/schema/SchemaProvider";

export class SqliteSchemaProvider implements SchemaProvider {
  constructor(private db: Database) {}

  async getSchemas(): Promise<string[]> {
    // SQLite has only `main` (and optionally `temp` and ATTACH-ed dbs).
    return ["main"];
  }

  async getTables(_schema?: string): Promise<TableInfo[]> {
    const rows = this.exec(
      "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name"
    );
    return rows.map((row) => ({
      name: row[0] as string,
      kind: row[1] as string,
    }));
  }

  async getColumns(table: string, _schema?: string): Promise<ColumnInfo[]> {
    // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
    // We can't bind parameters into PRAGMA in sql.js, so we whitelist the
    // identifier and inline it (escaped). The table name comes from the
    // editor's own AST, so it's user-controlled, but only via SQL the user
    // already wrote.
    const safe = table.replace(/"/g, '""');
    const rows = this.exec(`PRAGMA table_info("${safe}")`);
    return rows.map((row) => ({
      name: row[1] as string,
      dataType: (row[2] as string) || undefined,
      nullable: (row[3] as number) === 0,
      primaryKey: (row[5] as number) > 0,
    }));
  }

  async getDefaultSchema(): Promise<string | undefined> {
    return "main";
  }

  // --- internal -----------------------------------------------------------

  private exec(sql: string): unknown[][] {
    const result = this.db.exec(sql);
    if (result.length === 0) return [];
    return result[0].values;
  }
}
