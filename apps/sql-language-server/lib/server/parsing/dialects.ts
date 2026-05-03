import {
  StandardSQL,
  PostgreSQL,
  MySQL,
  SQLite,
  SQLDialect,
} from "@codemirror/lang-sql";

/**
 * Dialects supported by v1. ANSI is the safe baseline; the others have
 * dedicated keyword sets and quoting rules in @codemirror/lang-sql.
 */
export type Dialect = "ansi" | "postgres" | "mysql" | "sqlite";

const DIALECTS: Record<Dialect, SQLDialect> = {
  ansi: StandardSQL,
  postgres: PostgreSQL,
  mysql: MySQL,
  sqlite: SQLite,
};

export function resolveDialect(dialect: Dialect): SQLDialect {
  return DIALECTS[dialect] ?? StandardSQL;
}

/**
 * Map a dialect to the identifier expected by `node-sql-parser`. Returns
 * undefined if `node-sql-parser` doesn't have a clean equivalent (e.g. ANSI
 * — we fall back to PostgreSQL there as the most lenient strict dialect).
 */
export function nodeSqlParserDialect(dialect: Dialect): string {
  switch (dialect) {
    case "postgres":
      return "postgresql";
    case "mysql":
      return "mysql";
    case "sqlite":
      return "sqlite";
    case "ansi":
    default:
      return "postgresql";
  }
}

/**
 * Map a dialect to the identifier expected by `sql-query-identifier`.
 */
export function statementSplitterDialect(
  dialect: Dialect
): "generic" | "psql" | "mysql" | "sqlite" {
  switch (dialect) {
    case "postgres":
      return "psql";
    case "mysql":
      return "mysql";
    case "sqlite":
      return "sqlite";
    case "ansi":
    default:
      return "generic";
  }
}
