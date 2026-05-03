import { Parser } from "node-sql-parser";
import { Dialect, nodeSqlParserDialect } from "./dialects";

export interface SemanticIssue {
  /** Offset within the *statement* (not the whole document). */
  message: string;
  severity: "error" | "warning";
}

export interface StatementAnalysis {
  /** True if the statement parsed cleanly. */
  ok: boolean;
  /** Tables referenced, including those in FROM/JOIN/UPDATE/DELETE/INSERT INTO. */
  tables: { schema?: string; name: string }[];
  /** Columns referenced. */
  columns: { table?: string; name: string }[];
  /** Parse error message, if any. */
  error?: string;
}

/**
 * Strict-parser tier. Only call on *complete* statements (use the statement
 * splitter to bound the input). Returns a structured analysis or marks the
 * statement as un-parseable. Never throws.
 *
 * `node-sql-parser` exposes `tableList`/`columnList` helpers in the form
 * `["{type}::{db}::{table}"]` and `["{type}::{table}::{column}"]` — we parse
 * those into structured form.
 */
export class AstParser {
  private parser = new Parser();

  analyze(sql: string, dialect: Dialect): StatementAnalysis {
    const opt = { database: nodeSqlParserDialect(dialect) };
    try {
      // Round-trip: parse then extract refs. We don't currently use the AST
      // directly — the helpers give us what we need for diagnostics.
      this.parser.astify(sql, opt);
      const tableList = safeCall(() => this.parser.tableList(sql, opt));
      const columnList = safeCall(() => this.parser.columnList(sql, opt));
      return {
        ok: true,
        tables: parseTableList(tableList ?? []),
        columns: parseColumnList(columnList ?? []),
      };
    } catch (e: any) {
      return {
        ok: false,
        tables: [],
        columns: [],
        error: e?.message ?? String(e),
      };
    }
  }
}

function safeCall<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

/**
 * Parse "select::db::table" entries. `db` may be "null" for unqualified refs.
 */
function parseTableList(
  raw: string[]
): { schema?: string; name: string }[] {
  const out: { schema?: string; name: string }[] = [];
  for (const entry of raw) {
    const parts = entry.split("::");
    if (parts.length < 3) continue;
    const [, db, table] = parts;
    out.push({
      schema: db && db !== "null" ? db : undefined,
      name: table,
    });
  }
  return out;
}

/**
 * Parse "select::table::column" entries.
 */
function parseColumnList(
  raw: string[]
): { table?: string; name: string }[] {
  const out: { table?: string; name: string }[] = [];
  for (const entry of raw) {
    const parts = entry.split("::");
    if (parts.length < 3) continue;
    const [, table, column] = parts;
    out.push({
      table: table && table !== "null" ? table : undefined,
      name: column,
    });
  }
  return out;
}
