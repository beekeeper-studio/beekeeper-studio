import _ from "lodash";

/** Single-column results that hold a query plan. */
const PLAN_COLUMNS = new Set([
  "query plan", // PostgreSQL, CockroachDB, Redshift
  "explain", // MySQL and MariaDB with FORMAT=JSON or TREE, EXPLAIN ANALYZE; ClickHouse
  "plan_table_output", // Oracle DBMS_XPLAN
  "microsoft sql server 2005 xml showplan", // SQL Server SHOWPLAN_XML
]);

/** Multi-column results that hold a query plan. */
const PLAN_COLUMN_SETS = [
  ["id", "parent", "notused", "detail"], // SQLite EXPLAIN QUERY PLAN
  ["explain_key", "explain_value"], // DuckDB
];

function stripLeadingComments(sql: string): string {
  let rest = sql.trimStart();
  for (;;) {
    if (rest.startsWith("--")) {
      const end = rest.indexOf("\n");
      rest = end === -1 ? "" : rest.slice(end + 1).trimStart();
    } else if (rest.startsWith("/*")) {
      const end = rest.indexOf("*/");
      rest = end === -1 ? "" : rest.slice(end + 2).trimStart();
    } else {
      return rest;
    }
  }
}

/** A table or column name, optionally quoted or qualified (`db.tbl`). */
const NAME = /(?:`[^`]+`|"[^"]+"|[a-z_$][\w$]*)(?:\.(?:`[^`]+`|"[^"]+"|[a-z_$][\w$]*))*/.source;

/** MySQL and MariaDB read `EXPLAIN tbl_name [col_name | 'wild']` as DESCRIBE. */
const EXPLAIN_TABLE = new RegExp(`^explain\\s+(${NAME})(?:\\s+(?:${NAME}|'[^']*'))?\\s*;?\\s*$`, "i");

/** Statements that fit that shape but do ask for a plan, e.g. `EXPLAIN TABLE t`. */
const STATEMENT_KEYWORDS = new Set(["select", "table", "execute", "values"]);

export function isExplainStatement(sql?: string | null): boolean {
  const statement = stripLeadingComments(sql ?? "");
  if (!/^explain\b/i.test(statement)) return false;
  const describe = EXPLAIN_TABLE.exec(statement);
  return !describe || STATEMENT_KEYWORDS.has(describe[1].toLowerCase());
}

export function hasPlanColumns(fields?: { name?: string }[] | null): boolean {
  if (!fields?.length) return false;
  const names = fields.map((field) => (field.name ?? "").toLowerCase());
  if (names.length === 1 && PLAN_COLUMNS.has(names[0])) return true;
  return PLAN_COLUMN_SETS.some((set) => _.isEqual(names, set));
}

/** Whether a query result is a query plan, from the statement that produced
 * it or the shape of its columns. */
export function isExplainResult(
  result: { fields?: { name?: string }[] } | null | undefined,
  statement?: string | null
): boolean {
  return isExplainStatement(statement) || hasPlanColumns(result?.fields);
}
