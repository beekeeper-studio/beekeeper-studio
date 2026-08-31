import {
  Cassandra,
  MSSQL,
  MySQL as BaseMySQL,
  PostgreSQL,
  SQLDialect,
  SQLite as BaseSQLite,
  StandardSQL,
} from "@codemirror/lang-sql";

// `caseInsensitiveIdentifiers` tells the completion engine that unquoted
// MixedCase names are safe — the dialect either preserves their case (MySQL,
// SQL Server) or compares case-insensitively (SQLite) — so completions only
// quote names that genuinely need it. PostgreSQL-family dialects fold
// unquoted identifiers to lowercase, so they must keep the flag unset.

const GREENGAGE_EXTRA_KEYWORDS = [
  "distributed", "exchange", "inclusive", "list", "protocol", "resource",
  "retrieve", "subpartition", "text", "replicated",
].join(" ");

export const GreengageSQL = SQLDialect.define({
  ...PostgreSQL.spec,
  keywords: (PostgreSQL.spec.keywords || "") + " " + GREENGAGE_EXTRA_KEYWORDS,
});

export const MySQL = SQLDialect.define({
  ...BaseMySQL.spec,
  caseInsensitiveIdentifiers: true,
});

// SQLite accepts backticks and brackets as MySQL/MSSQL compatibility extras,
// but its own convention is standard double quotes — put `"` first so
// completions insert it (the tokenizer still recognizes both).
export const SQLite = SQLDialect.define({
  ...BaseSQLite.spec,
  identifierQuotes: "\"`",
  caseInsensitiveIdentifiers: true,
});

export const SQLServer = SQLDialect.define({
  // Spread the spec, not the dialect instance: spreading `MSSQL` itself drops
  // every T-SQL keyword/builtin/type list (they live on `spec`).
  ...MSSQL.spec,
  identifierQuotes: "[\"",
  caseInsensitiveIdentifiers: true,
})

// PartiQL — the SQL-compatible dialect AWS DynamoDB exposes via
// ExecuteStatementCommand. Identifiers are double-quoted (PartiQL/ANSI style)
// and strings are single-quoted, so we explicitly keep `doubleQuotedStrings`
// false so `"TableName"` tokenizes as an identifier. Keywords cover the
// DynamoDB subset plus a few PartiQL-specific forms (VALUE, MISSING,
// ATTRIBUTE_EXISTS, BEGINS_WITH, CONTAINS).
const PARTIQL_KEYWORDS = [
  "select", "insert", "update", "delete", "from", "where",
  "and", "or", "not", "in", "is", "between", "like",
  "exists", "missing", "null", "true", "false",
  "as", "by", "order", "group", "having", "limit", "asc", "desc",
  "distinct", "all", "union", "case", "when", "then", "else", "end",
  "value", "values", "set", "returning", "into",
  "begin", "commit", "rollback",
  "contains", "begins_with", "attribute_exists", "attribute_not_exists", "size",
].join(" ");

// DynamoDB attribute type names, written out in full (String, Number, Binary,
// Boolean, Null, Map, List, String Set, Number Set, Binary Set). `set` is
// included so the "… Set" forms highlight as type tokens.
const PARTIQL_TYPES = [
  "string", "number", "binary", "boolean", "null", "map", "list", "set",
].join(" ");

export const PartiQL = SQLDialect.define({
  keywords: PARTIQL_KEYWORDS,
  types: PARTIQL_TYPES,
  builtin: "",
  hashComments: false,
  slashComments: false,
  spaceAfterDashes: false,
  doubleQuotedStrings: false, // "quoted" = identifier, 'quoted' = string
  backslashEscapes: false,
  operatorChars: "*+-%<>!=&|~^/",
  identifierQuotes: "\"",
});

/**
 * The dialect used for each `languageId`. This is the single source of truth
 * for which CodeMirror SQL dialect backs each Beekeeper language mode, so
 * tests can exercise exactly what the editor wires up per database.
 */
export const langIdToDialect = {
  "text/x-sql": StandardSQL,
  "text/x-pgsql": PostgreSQL,
  "text/x-ggsql": GreengageSQL,
  "text/x-mysql": MySQL,
  "text/x-cassandra": Cassandra,
  "text/x-sqlite": SQLite,
  "text/x-partiql": PartiQL,
  "text/x-mssql": SQLServer,
} as const;
