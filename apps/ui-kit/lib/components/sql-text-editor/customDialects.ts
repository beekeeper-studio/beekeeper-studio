import {PostgreSQL, SQLDialect} from "@codemirror/lang-sql";

const GREENGAGE_EXTRA_KEYWORDS = [
  "distributed", "exchange", "inclusive", "list", "protocol", "resource",
  "retrieve", "subpartition", "text", "replicated",
].join(" ");

export const GreengageSQL = SQLDialect.define({
  ...PostgreSQL.spec,
  keywords: (PostgreSQL.spec.keywords || "") + " " + GREENGAGE_EXTRA_KEYWORDS,
});

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

const PARTIQL_TYPES = [
  "s", "n", "b", "bool", "null", "l", "m", "ss", "ns", "bs",
  "string", "number", "binary", "list", "map", "boolean",
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
