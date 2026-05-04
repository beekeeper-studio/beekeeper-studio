import {
  CompletionItem,
  CompletionItemKind,
  Position,
  TextDocumentPositionParams,
} from "vscode-languageserver/browser";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ClauseContext, CursorContext, LiveParser } from "../parsing/LiveParser";
import { Dialect } from "../parsing/dialects";
import { SchemaCache } from "../schema/SchemaCache";

/**
 * Produce completion items at a given document position.
 *
 * The dispatch shape (clause → kind of completion) is drafted from
 * joe-re/sql-language-server's MIT TypeScript completion code. Our parser
 * layer (Lezer-based, error-tolerant) replaces its hand-written PEG parser.
 *
 * # Behavior on `SELECT |` with no FROM yet
 *
 * Empty tables-in-scope → no columns. We surface only the small set of
 * keywords/functions that are actually valid here (DISTINCT, ALL, *, FROM,
 * CASE, NOT, COUNT, SUM, AVG, ...). This is the conservative path and
 * matches Supabase postgres-language-server's behavior. Tools like DataGrip
 * take the aggressive path and surface every column from every table,
 * prefixed by table name — that's noisier and is left as a future v2 mode.
 */
export async function provideCompletion(
  doc: TextDocument,
  params: TextDocumentPositionParams,
  parser: LiveParser,
  dialect: Dialect,
  schema: SchemaCache
): Promise<CompletionItem[]> {
  const text = doc.getText();
  const offset = doc.offsetAt(params.position);
  const tree = parser.parse(text, dialect);
  const ctx = parser.contextAt(tree, text, offset);

  // Qualified completion: `<alias|schema>.<partial>` — always columns or
  // tables, regardless of clause.
  if (ctx.afterDot && ctx.qualifier) {
    return await qualifiedCompletion(ctx.qualifier, ctx.tablesInScope, schema);
  }

  switch (ctx.clause) {
    case "from":
    case "join":
    case "delete":
    case "update":
    case "insert":
      return [
        ...(await tableCompletions(schema)),
        ...keywordsForClause(ctx.clause, dialect),
      ];

    case "select":
    case "where":
    case "group-by":
    case "order-by":
    case "having":
    case "join-on":
    case "set":
    case "values": {
      const items: CompletionItem[] = [
        ...(await columnsForScope(ctx.tablesInScope, schema)),
        ...keywordsForClause(ctx.clause, dialect),
      ];
      // Aliases / table refs as columns-of-aliases hint.
      for (const t of ctx.tablesInScope) {
        items.push({
          label: t.name,
          kind: CompletionItemKind.Reference,
          detail:
            t.table && t.table !== t.name
              ? `alias for ${t.table}`
              : "table",
        });
      }
      return items;
    }

    case "begin":
    case "unknown":
    default:
      return keywordsForClause(ctx.clause, dialect);
  }
}

async function qualifiedCompletion(
  qualifier: string,
  tablesInScope: { name: string; table?: string; schema?: string }[],
  schema: SchemaCache
): Promise<CompletionItem[]> {
  // Is the qualifier an in-scope table or alias? → its columns.
  const match = tablesInScope.find(
    (t) => t.name.toLowerCase() === qualifier.toLowerCase()
  );
  if (match) {
    const cols = await schema.getColumns(match.table ?? match.name, match.schema);
    return cols.map((c) => ({
      label: c.name,
      kind: CompletionItemKind.Field,
      detail: c.dataType,
    }));
  }

  // Otherwise: treat as a schema name → its tables.
  const tables = await schema.getTables(qualifier);
  return tables.map((t) => ({
    label: t.name,
    kind: CompletionItemKind.Class,
    detail: `${qualifier}.${t.name}`,
  }));
}

async function tableCompletions(schema: SchemaCache): Promise<CompletionItem[]> {
  const out: CompletionItem[] = [];
  const defaultSchema = await schema.getDefaultSchema();
  const tables = await schema.getTables(defaultSchema);
  for (const t of tables) {
    out.push({
      label: t.name,
      kind: CompletionItemKind.Class,
      detail: t.kind ?? "table",
    });
  }
  // Schema-qualified options too.
  const schemas = await schema.getSchemas();
  for (const s of schemas) {
    if (s === defaultSchema) continue;
    out.push({
      label: s,
      kind: CompletionItemKind.Module,
      detail: "schema",
    });
  }
  return out;
}

async function columnsForScope(
  tablesInScope: { name: string; table?: string; schema?: string }[],
  schema: SchemaCache
): Promise<CompletionItem[]> {
  const out: CompletionItem[] = [];
  const seen = new Set<string>();
  for (const ref of tablesInScope) {
    const key = `${ref.schema ?? ""}::${ref.table ?? ref.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cols = await schema.getColumns(ref.table ?? ref.name, ref.schema);
    for (const c of cols) {
      out.push({
        label: c.name,
        kind: CompletionItemKind.Field,
        detail: ref.name + (c.dataType ? ` : ${c.dataType}` : ""),
      });
    }
  }
  return out;
}

// --- clause-specific keyword sets -------------------------------------------

const COMMON_OPS = ["AND", "OR", "NOT", "IS NULL", "IS NOT NULL"];
const PREDICATE_OPS = [
  "BETWEEN",
  "IN",
  "LIKE",
  "EXISTS",
  "AND",
  "OR",
  "NOT",
  "IS NULL",
  "IS NOT NULL",
];

const AGG_FUNCTIONS = ["COUNT", "SUM", "AVG", "MIN", "MAX"];
const SCALAR_FUNCTIONS = [
  "COALESCE",
  "NULLIF",
  "CAST",
  "LENGTH",
  "LOWER",
  "UPPER",
  "TRIM",
  "SUBSTRING",
  "ABS",
  "ROUND",
];

const KEYWORDS_BY_CLAUSE: Partial<Record<ClauseContext, string[]>> = {
  // Top-level statement starters.
  begin: [
    "SELECT",
    "WITH",
    "INSERT INTO",
    "UPDATE",
    "DELETE FROM",
    "CREATE TABLE",
    "CREATE INDEX",
    "CREATE VIEW",
    "ALTER TABLE",
    "DROP TABLE",
    "EXPLAIN",
  ],
  unknown: [
    "SELECT",
    "WITH",
    "INSERT INTO",
    "UPDATE",
    "DELETE FROM",
  ],
  // Inside the SELECT projection: aggregates, scalar functions, modifiers,
  // CASE, plus the natural transition keyword FROM.
  select: [
    "DISTINCT",
    "ALL",
    "*",
    "AS",
    "CASE",
    "WHEN",
    "THEN",
    "ELSE",
    "END",
    "NOT",
    "NULL",
    "TRUE",
    "FALSE",
    "FROM",
    ...AGG_FUNCTIONS,
    ...SCALAR_FUNCTIONS,
  ],
  // FROM/JOIN clauses: tables come from schema; keywords are JOIN family +
  // transitions out of the clause.
  from: [
    "INNER JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "FULL JOIN",
    "CROSS JOIN",
    "JOIN",
    "WHERE",
    "GROUP BY",
    "ORDER BY",
    "LIMIT",
    "AS",
  ],
  join: [
    "AS",
    "ON",
    "USING",
  ],
  "join-on": [
    "AND",
    "OR",
    "NOT",
    "EXISTS",
    ...AGG_FUNCTIONS,
  ],
  // WHERE-family clauses: predicate operators + transitions to following
  // clauses.
  where: [
    ...PREDICATE_OPS,
    "GROUP BY",
    "ORDER BY",
    "LIMIT",
    "CASE",
    "WHEN",
    "THEN",
    "ELSE",
    "END",
    ...AGG_FUNCTIONS,
    ...SCALAR_FUNCTIONS,
  ],
  having: [
    ...PREDICATE_OPS,
    "ORDER BY",
    "LIMIT",
    ...AGG_FUNCTIONS,
  ],
  "group-by": [
    "HAVING",
    "ORDER BY",
    "LIMIT",
    "ASC",
    "DESC",
  ],
  "order-by": [
    "ASC",
    "DESC",
    "NULLS FIRST",
    "NULLS LAST",
    "LIMIT",
  ],
  // SET in UPDATE: just columns + WHERE transition.
  set: ["WHERE", ...COMMON_OPS],
  // VALUES: literal-like things.
  values: ["NULL", "DEFAULT", "TRUE", "FALSE", ...SCALAR_FUNCTIONS],
  // After UPDATE/INSERT/DELETE keyword, before the table name.
  update: [],
  insert: [],
  delete: [],
};

const DIALECT_EXTRA: Partial<Record<Dialect, Partial<Record<ClauseContext, string[]>>>> = {
  postgres: {
    select: ["RETURNING"],
    where: ["RETURNING", "ILIKE"],
    join: ["LATERAL"],
  },
  mysql: {
    select: ["DUAL"],
  },
  sqlite: {
    begin: ["ATTACH DATABASE", "DETACH DATABASE", "VACUUM", "PRAGMA"],
  },
};

function keywordsForClause(
  clause: ClauseContext,
  dialect: Dialect
): CompletionItem[] {
  const base = KEYWORDS_BY_CLAUSE[clause] ?? [];
  const extras = DIALECT_EXTRA[dialect]?.[clause] ?? [];
  return dedupe([...base, ...extras]).map((kw) => ({
    label: kw,
    kind: CompletionItemKind.Keyword,
    // Sort keywords AFTER columns/tables — those are the user's actual data.
    sortText: `8${kw}`,
  }));
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

// Re-export for tests to use a stable position helper.
export function _positionAt(doc: TextDocument, offset: number): Position {
  return doc.positionAt(offset);
}
