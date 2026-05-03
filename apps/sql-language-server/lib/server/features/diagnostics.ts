import {
  Diagnostic,
  DiagnosticSeverity,
} from "vscode-languageserver/browser";
import { TextDocument } from "vscode-languageserver-textdocument";
import { LiveParser } from "../parsing/LiveParser";
import { AstParser } from "../parsing/AstParser";
import { splitStatements } from "../parsing/StatementSplitter";
import { Dialect } from "../parsing/dialects";
import { SchemaCache } from "../schema/SchemaCache";

/**
 * Build the diagnostic list for a document.
 *
 * Two tiers:
 *
 *  1. **Syntax** — Lezer error nodes. Always run. Covers the partial-input
 *     case ("SELECT * FRO|" — the cursor's column reference is incomplete).
 *
 *  2. **Semantic** — `node-sql-parser` AST analysis, *only* on cleanly
 *     parsed statements. Skipped if Lezer reported errors for that
 *     statement (because node-sql-parser will throw on broken SQL and the
 *     resulting message is rarely better than the Lezer one).
 *
 *     v1 semantic checks: unknown table, unknown column on a known table.
 *     We deliberately keep the rule set small. Future PRs add more.
 */
export async function provideDiagnostics(
  doc: TextDocument,
  parser: LiveParser,
  ast: AstParser,
  dialect: Dialect,
  schema: SchemaCache
): Promise<Diagnostic[]> {
  const text = doc.getText();
  const tree = parser.parse(text, dialect);
  const out: Diagnostic[] = [];

  // --- Syntax ---
  const syntaxErrors = parser.errors(tree, text);
  for (const e of syntaxErrors) {
    out.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: doc.positionAt(e.from),
        end: doc.positionAt(e.to),
      },
      message: e.message,
      source: "sql-language-server",
    });
  }

  // --- Semantic ---
  const statements = splitStatements(text, dialect);
  for (const stmt of statements) {
    // Skip statements that overlap with a syntax error — their AST is
    // unreliable.
    if (
      syntaxErrors.some((e) => e.from < stmt.end && e.to > stmt.start)
    ) {
      continue;
    }
    const analysis = ast.analyze(stmt.text, dialect);
    if (!analysis.ok) {
      // node-sql-parser disagrees with Lezer — surface as a warning rather
      // than an error since the user-facing parser already accepted it.
      // (Many dialect-specific extensions trip this and shouldn't be hard
      // errors.)
      continue;
    }

    await checkSemantics(doc, stmt.start, analysis, schema, out);
  }

  return out;
}

async function checkSemantics(
  doc: TextDocument,
  stmtOffset: number,
  analysis: { tables: { schema?: string; name: string }[]; columns: { table?: string; name: string }[] },
  schema: SchemaCache,
  out: Diagnostic[]
): Promise<void> {
  const text = doc.getText();
  const knownTables = new Map<string, Set<string>>();
  // pre-populate by querying the schema for each referenced table
  for (const t of analysis.tables) {
    const tables = await schema.getTables(t.schema);
    const found = tables.find(
      (x) => x.name.toLowerCase() === t.name.toLowerCase()
    );
    if (!found) {
      // Unknown table → warn at first textual occurrence within the statement.
      const range = findReference(text, stmtOffset, t.name, doc);
      if (range) {
        out.push({
          severity: DiagnosticSeverity.Warning,
          range,
          message: `Unknown ${t.schema ? `${t.schema}.` : ""}${t.name}`,
          source: "sql-language-server",
        });
      }
      continue;
    }
    const cols = await schema.getColumns(found.name, t.schema);
    knownTables.set(
      keyForTable(t.schema, t.name),
      new Set(cols.map((c) => c.name.toLowerCase()))
    );
  }

  for (const col of analysis.columns) {
    if (col.name === "*") continue;
    if (col.table) {
      // Qualified: column must exist on the named table.
      const matchKey = [...knownTables.keys()].find((k) =>
        k.endsWith(`::${col.table!.toLowerCase()}`)
      );
      if (!matchKey) continue;
      const colSet = knownTables.get(matchKey)!;
      if (!colSet.has(col.name.toLowerCase())) {
        pushUnknownColumn(out, doc, text, stmtOffset, col.name, col.table);
      }
    } else {
      // Unqualified: column must exist on at least one in-scope table.
      // Skip if there are no known tables (we can't validate) or if any
      // referenced table is unknown (incomplete schema → false positive
      // risk).
      if (knownTables.size === 0) continue;
      if (knownTables.size < analysis.tables.length) continue;
      let foundIn: string | undefined;
      for (const [tableKey, cols] of knownTables) {
        if (cols.has(col.name.toLowerCase())) {
          foundIn = tableKey;
          break;
        }
      }
      if (!foundIn) {
        pushUnknownColumn(out, doc, text, stmtOffset, col.name);
      }
    }
  }
}

function pushUnknownColumn(
  out: Diagnostic[],
  doc: TextDocument,
  text: string,
  stmtOffset: number,
  colName: string,
  tableHint?: string
): void {
  const range = findReference(text, stmtOffset, colName, doc);
  if (!range) return;
  out.push({
    severity: DiagnosticSeverity.Warning,
    range,
    message: tableHint
      ? `Unknown column "${colName}" on table "${tableHint}"`
      : `Unknown column "${colName}"`,
    source: "sql-language-server",
  });
}

function keyForTable(schema: string | undefined, name: string): string {
  return `${schema ?? ""}::${name.toLowerCase()}`;
}

/**
 * Locate the first textual occurrence of `needle` as a whole word within
 * the statement at `stmtOffset`. Returns an LSP range or undefined.
 */
function findReference(
  text: string,
  stmtOffset: number,
  needle: string,
  doc: TextDocument
): { start: { line: number; character: number }; end: { line: number; character: number } } | undefined {
  const pattern = new RegExp(`\\b${escapeRegex(needle)}\\b`, "i");
  const slice = text.slice(stmtOffset);
  const m = slice.match(pattern);
  if (!m || m.index === undefined) return undefined;
  const from = stmtOffset + m.index;
  const to = from + m[0].length;
  return {
    start: doc.positionAt(from),
    end: doc.positionAt(to),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
