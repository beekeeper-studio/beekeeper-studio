import { identify } from "sql-query-identifier";
import { Dialect, statementSplitterDialect } from "./dialects";

export interface Statement {
  /** Character offset (inclusive) of the start of the statement. */
  start: number;
  /** Character offset (exclusive) of the end of the statement. */
  end: number;
  text: string;
  /** Type as classified by sql-query-identifier (SELECT, INSERT, etc.). */
  type: string;
}

/**
 * Wraps `sql-query-identifier` to split a document into statements. The
 * library is dialect-aware (handles `$$`-quoted strings for Postgres, etc.)
 * and is already used elsewhere in the codebase, so reuse keeps behaviour
 * consistent.
 *
 * On parse failure (e.g. truly broken SQL it can't tokenise) we fall back
 * to returning the whole document as a single anonymous statement — better
 * than throwing, since the language server must keep working on broken
 * input.
 */
export function splitStatements(text: string, dialect: Dialect): Statement[] {
  try {
    const ids = identify(text, {
      dialect: statementSplitterDialect(dialect),
      strict: false,
    } as any);
    return ids.map((s: any) => ({
      start: s.start,
      end: s.end + 1, // sql-query-identifier returns inclusive end
      text: s.text,
      type: s.type,
    }));
  } catch {
    return [
      {
        start: 0,
        end: text.length,
        text,
        type: "UNKNOWN",
      },
    ];
  }
}

/**
 * Find the statement that contains `offset`, or undefined if none.
 */
export function statementAt(
  statements: Statement[],
  offset: number
): Statement | undefined {
  return statements.find((s) => offset >= s.start && offset <= s.end);
}
