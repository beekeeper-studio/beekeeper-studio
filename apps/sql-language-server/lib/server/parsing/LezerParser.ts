import { Tree, SyntaxNode } from "@lezer/common";
import { resolveDialect, Dialect } from "./dialects";
import {
  ClauseContext,
  CursorContext,
  LiveParser,
  ParseError,
  TableRef,
} from "./LiveParser";

/**
 * Lezer-based implementation of LiveParser. Wraps @codemirror/lang-sql's
 * dialect parsers. Lezer recovers from broken input by emitting "⚠" error
 * nodes — we surface those as diagnostics.
 *
 * Context detection is intentionally simple: scan the token stream backwards
 * from the cursor to find the most recent clause-introducing keyword. This
 * mirrors what joe-re/sql-language-server does in its `complete/index.ts`,
 * but operates on Lezer's error-tolerant tree instead of a hand-written PEG
 * parser. We keep the implementation deliberately straightforward — the
 * tree is always valid (even if it contains error nodes), so we don't need
 * to defend against parser failure.
 */
export class LezerParser implements LiveParser {
  parse(text: string, dialect: Dialect): Tree {
    const sqlDialect = resolveDialect(dialect);
    // SQLDialect.language.parser is a Lezer Parser; .parse(text) is the
    // standard entry point.
    return sqlDialect.language.parser.parse(text);
  }

  errors(tree: Tree, text: string): ParseError[] {
    const out: ParseError[] = [];
    tree.iterate({
      enter: (node) => {
        if (node.type.isError) {
          const slice = text.slice(node.from, node.to);
          // Empty-range error nodes mean "expected more input here". Give
          // them a 1-char range so the editor has something to underline.
          const to = node.from === node.to ? node.from + 1 : node.to;
          out.push({
            from: node.from,
            to,
            message: slice
              ? `Unexpected token: ${truncate(slice)}`
              : "Unexpected end of input",
          });
        }
      },
    });
    return out;
  }

  contextAt(tree: Tree, text: string, offset: number): CursorContext {
    const partial = readPartialIdent(text, offset);
    const afterDot = isAfterDot(text, partial ? partial.from : offset);
    const qualifier = afterDot
      ? readIdentBefore(text, partial ? partial.from : offset, /* skipDot */ true)
      : undefined;

    const stmtNode = enclosingStatement(tree, offset);
    const clause = detectClause(text, stmtNode, offset);
    const tablesInScope = collectTables(text, stmtNode);

    return {
      clause,
      afterDot,
      qualifier,
      tablesInScope,
      partial,
    };
  }

  keywords(dialect: Dialect): string[] {
    // Dialect spec keyword lists are exposed as an internal field, but
    // @codemirror/lang-sql also publishes `keywordCompletion` which is
    // dialect-specific. For v1 we use a curated ANSI core list — dialect
    // extras can be layered on later by the host when displaying completion.
    return CORE_KEYWORDS.concat(DIALECT_EXTRA[dialect] ?? []);
  }
}

// --- helpers ---------------------------------------------------------------

function truncate(s: string): string {
  return s.length > 32 ? s.slice(0, 29) + "..." : s;
}

function isWordChar(ch: string): boolean {
  return /[A-Za-z0-9_$]/.test(ch);
}

/**
 * If the cursor is in or just after an identifier, return its range.
 * Otherwise undefined.
 */
function readPartialIdent(
  text: string,
  offset: number
): { from: number; to: number; text: string } | undefined {
  let from = offset;
  while (from > 0 && isWordChar(text[from - 1])) from--;
  let to = offset;
  while (to < text.length && isWordChar(text[to])) to++;
  if (from === to) return undefined;
  return { from, to, text: text.slice(from, to) };
}

function isAfterDot(text: string, offset: number): boolean {
  let i = offset - 1;
  // skip the partial identifier the cursor is currently typing
  // (we already excluded it via partial.from)
  while (i >= 0 && /\s/.test(text[i])) i--;
  return text[i] === ".";
}

function readIdentBefore(
  text: string,
  offset: number,
  skipDot: boolean
): string | undefined {
  let i = offset - 1;
  if (skipDot) {
    while (i >= 0 && /\s/.test(text[i])) i--;
    if (text[i] !== ".") return undefined;
    i--;
    while (i >= 0 && /\s/.test(text[i])) i--;
  }
  let to = i + 1;
  while (i >= 0 && isWordChar(text[i])) i--;
  let from = i + 1;
  if (from === to) return undefined;
  return text.slice(from, to);
}

/**
 * Find the Statement node that "contains" `offset`. If `offset` falls
 * within a Statement's range, return that. Otherwise — typically because
 * the cursor sits in trailing whitespace after the last token of the
 * current Statement — return the most-recently-started Statement whose
 * `from` is at or before `offset`. Falls back to the root.
 *
 * This handles the very common live-typing case ("SELECT * FROM " with
 * cursor at end of buffer): the Lezer Statement ends at "FROM", but the
 * user's cursor is past it, and we still want to attribute completion to
 * that statement.
 */
function enclosingStatement(tree: Tree, offset: number): SyntaxNode {
  let node: SyntaxNode = tree.resolveInner(offset, -1);
  while (node.parent && !isStatementNode(node)) {
    node = node.parent;
  }
  if (isStatementNode(node) && node.type.name !== "Script") return node;

  // Cursor is past the last token of any statement. Walk Script's
  // children to find the latest Statement that started at or before
  // `offset`.
  const root = tree.topNode;
  let best: SyntaxNode | undefined;
  let cur = root.firstChild;
  while (cur) {
    if (cur.type.name === "Statement" || cur.type.name.endsWith("Statement")) {
      if (cur.from <= offset) {
        if (!best || cur.from > best.from) best = cur;
      }
    }
    cur = cur.nextSibling;
  }
  return best ?? root;
}

function isStatementNode(node: SyntaxNode): boolean {
  // The Lezer SQL grammar uses node names ending in "Statement" or simply
  // "Statement". Be permissive: also accept "Script" as the root.
  const n = node.type.name;
  return n === "Statement" || n.endsWith("Statement") || n === "Script";
}

/**
 * Walk tokens within `stmt` up to `offset` and pick the most recent
 * clause-introducing keyword. Tokens at or past `offset` are ignored —
 * those are tokens the user is typing toward, not ones that establish
 * context.
 */
function detectClause(
  text: string,
  stmt: SyntaxNode,
  offset: number
): ClauseContext {
  let lastClause: ClauseContext = "begin";
  let cur = stmt.firstChild;
  while (cur) {
    if (cur.from >= offset) break;
    if (cur.type.name === "Keyword") {
      const kw = text.slice(cur.from, cur.to).toUpperCase();
      const c = clauseFromKeyword(kw, text, cur.to);
      if (c) lastClause = c;
    }
    // Recurse into compound nodes (subqueries, parenthesised expressions, etc.)
    if (cur.firstChild && cur.from < offset && cur.to >= offset) {
      const nested = detectClause(text, cur, offset);
      if (nested !== "begin" && nested !== "unknown") lastClause = nested;
    }
    cur = cur.nextSibling;
  }
  return lastClause;
}

function clauseFromKeyword(
  kw: string,
  text: string,
  afterPos: number
): ClauseContext | undefined {
  switch (kw) {
    case "SELECT":
      return "select";
    case "FROM":
      return "from";
    case "JOIN":
      return "join";
    case "ON":
      return "join-on";
    case "WHERE":
      return "where";
    case "HAVING":
      return "having";
    case "SET":
      return "set";
    case "VALUES":
      return "values";
    case "UPDATE":
      return "update";
    case "INSERT":
      return "insert";
    case "DELETE":
      return "delete";
    case "GROUP": {
      // expect "GROUP BY"
      return /^\s*BY\b/i.test(text.slice(afterPos)) ? "group-by" : undefined;
    }
    case "ORDER": {
      return /^\s*BY\b/i.test(text.slice(afterPos)) ? "order-by" : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Collect tables and aliases declared in FROM / JOIN clauses of `stmt`. This
 * is deliberately heuristic: we walk the statement's tokens looking for
 * `FROM <ident>` and `JOIN <ident>` patterns, optionally followed by an
 * alias (with or without `AS`). The tree is error-tolerant, so "tokens" here
 * means direct children of the statement.
 */
function collectTables(text: string, stmt: SyntaxNode): TableRef[] {
  const tokens: { name: string; from: number; to: number }[] = [];
  const cursor = stmt.cursor();
  if (cursor.firstChild()) {
    do {
      const name = cursor.type.name;
      if (name === "Keyword" || name === "Identifier" || name === "QuotedIdentifier") {
        tokens.push({ name, from: cursor.from, to: cursor.to });
      }
    } while (cursor.nextSibling());
  }

  const out: TableRef[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.name !== "Keyword") continue;
    const kw = text.slice(tok.from, tok.to).toUpperCase();
    if (kw !== "FROM" && kw !== "JOIN") continue;

    // Next non-keyword token is the table identifier (possibly schema-qualified).
    const ident = tokens[i + 1];
    if (!ident || ident.name === "Keyword") continue;

    let table = unquote(text.slice(ident.from, ident.to));
    let schema: string | undefined;

    // Schema-qualified: <schema> . <table>
    const after = tokens[i + 2];
    const afterText =
      after && /^[Ii]dentifier|^Q/.test(after.name)
        ? text.slice(after.from, after.to)
        : "";
    if (text.slice(ident.to, after?.from ?? ident.to).trim() === "." && after) {
      schema = table;
      table = unquote(afterText);
      i += 2; // consume schema + dot + table
    }

    // Optional alias: AS <ident> | <ident>
    let alias: string | undefined;
    let lookahead = i + 2;
    if (
      tokens[lookahead] &&
      tokens[lookahead].name === "Keyword" &&
      text.slice(tokens[lookahead].from, tokens[lookahead].to).toUpperCase() ===
        "AS"
    ) {
      lookahead++;
    }
    const aliasTok = tokens[lookahead];
    if (
      aliasTok &&
      aliasTok.name !== "Keyword" &&
      !isClauseTerminator(text.slice(aliasTok.from, aliasTok.to))
    ) {
      alias = unquote(text.slice(aliasTok.from, aliasTok.to));
    }

    out.push({
      name: alias ?? table,
      table,
      schema,
    });
  }

  return out;
}

function unquote(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("`") && s.endsWith("`")) ||
    (s.startsWith("[") && s.endsWith("]"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

function isClauseTerminator(s: string): boolean {
  const upper = s.toUpperCase();
  return [
    "WHERE",
    "GROUP",
    "ORDER",
    "HAVING",
    "LIMIT",
    "OFFSET",
    "UNION",
    "INTERSECT",
    "EXCEPT",
    ";",
    ",",
  ].includes(upper);
}

// Curated ANSI keyword core. Comprehensive enough for completion; not a full
// reserved word list.
const CORE_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL JOIN",
  "ON",
  "GROUP BY",
  "ORDER BY",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "UNION",
  "UNION ALL",
  "INTERSECT",
  "EXCEPT",
  "INSERT INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE FROM",
  "CREATE TABLE",
  "ALTER TABLE",
  "DROP TABLE",
  "CREATE INDEX",
  "CREATE VIEW",
  "WITH",
  "AS",
  "AND",
  "OR",
  "NOT",
  "NULL",
  "IS",
  "IN",
  "EXISTS",
  "BETWEEN",
  "LIKE",
  "ILIKE",
  "DISTINCT",
  "ALL",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "CAST",
];

const DIALECT_EXTRA: Partial<Record<Dialect, string[]>> = {
  postgres: ["RETURNING", "USING", "LATERAL", "ILIKE", "::"],
  mysql: ["AUTO_INCREMENT", "ENGINE", "DUAL"],
  sqlite: ["WITHOUT ROWID", "ATTACH", "DETACH"],
};
