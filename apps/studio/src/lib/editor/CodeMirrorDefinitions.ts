import CodeMirror from "codemirror";
import "codemirror/mode/sql/sql";

CodeMirror.defineMIME("text/x-pgsql", {
  // eslint-disable-next-line
  // @ts-ignore
  ...CodeMirror.resolveMode("text/x-pgsql"),
  identifierQuote: '"',
  hooks: {
    // eslint-disable-next-line
    // @ts-ignore
    '"': CodeMirror.resolveMode("text/x-sqlite")?.hooks['"'],
  },
});

// PartiQL — DynamoDB's SQL-compatible query language. Double-quoted words are
// identifiers (reuse the sqlite hook for correctness), single-quoted are
// strings. Keywords cover the DynamoDB subset plus PartiQL extensions.
function partiqlSet(str: string) {
  const out: Record<string, boolean> = {};
  str.split(" ").forEach((w) => { if (w) out[w] = true; });
  return out;
}

CodeMirror.defineMIME("text/x-partiql", {
  name: "sql",
  keywords: partiqlSet([
    "select", "insert", "update", "delete", "from", "where",
    "and", "or", "not", "in", "is", "between", "like",
    "exists", "missing", "as", "by", "order", "group", "having",
    "limit", "asc", "desc", "distinct", "all", "union",
    "case", "when", "then", "else", "end",
    "value", "values", "set", "returning", "into",
    "begin", "commit", "rollback",
    "contains", "begins_with", "attribute_exists", "attribute_not_exists", "size",
  ].join(" ")),
  builtin: partiqlSet([
    "s", "n", "b", "bool", "null", "l", "m", "ss", "ns", "bs",
    "string", "number", "binary", "list", "map", "boolean",
  ].join(" ")),
  atoms: partiqlSet("false true null missing"),
  operatorChars: /^[*+\-%<>!=&|~^/]/,
  dateSQL: {},
  support: partiqlSet("doubleQuote"),
  identifierQuote: '"',
  hooks: {
    // eslint-disable-next-line
    // @ts-ignore
    '"': CodeMirror.resolveMode("text/x-sqlite")?.hooks['"'],
  },
});

declare module "codemirror" {
  interface Editor {
    lastCompletionState?: {
      token: string;
      from: Position;
      to: Position;
      list: any[];
      picked?: boolean;
    };
  }
}

