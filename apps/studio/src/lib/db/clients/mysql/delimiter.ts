/**
 * Rewrites MySQL/MariaDB scripts that use `DELIMITER` directives into a form
 * the MySQL wire protocol can accept directly. `DELIMITER` is a client-side
 * convention (used by the `mysql` CLI and tools like HeidiSQL) that lets users
 * terminate compound statements like `CREATE PROCEDURE ... BEGIN ... END`
 * without the inner `;` tokens being mistaken for statement boundaries.
 *
 * The MySQL server itself already understands BEGIN/END compound statements,
 * so once DELIMITER directives are stripped and the user's custom delimiter
 * is rewritten to `;`, the resulting script is valid input for a single
 * multi-statement query.
 */

const DELIMITER_KEYWORD_RE = /\bDELIMITER\b/i;

export function preprocessDelimiters(sql: string): string {
  if (!DELIMITER_KEYWORD_RE.test(sql)) {
    return sql;
  }

  const out: string[] = [];
  let activeDelimiter = ";";
  let i = 0;
  let atLineStart = true;

  while (i < sql.length) {
    if (atLineStart) {
      const match = matchDelimiterDirective(sql, i);
      if (match) {
        activeDelimiter = match.delimiter;
        i = match.nextIndex;
        atLineStart = true;
        continue;
      }
    }

    const ch = sql[i];

    if (ch === "'" || ch === '"' || ch === "`") {
      const end = consumeQuoted(sql, i, ch);
      out.push(sql.slice(i, end));
      i = end;
      atLineStart = false;
      continue;
    }

    if (ch === "-" && sql[i + 1] === "-" && isLineCommentBoundary(sql[i + 2])) {
      const end = consumeLineComment(sql, i);
      out.push(sql.slice(i, end));
      i = end;
      atLineStart = sql[end - 1] === "\n";
      continue;
    }

    if (ch === "#") {
      const end = consumeLineComment(sql, i);
      out.push(sql.slice(i, end));
      i = end;
      atLineStart = sql[end - 1] === "\n";
      continue;
    }

    if (ch === "/" && sql[i + 1] === "*") {
      const end = consumeBlockComment(sql, i);
      out.push(sql.slice(i, end));
      i = end;
      atLineStart = false;
      continue;
    }

    if (activeDelimiter !== ";" && startsWith(sql, i, activeDelimiter)) {
      out.push(";");
      i += activeDelimiter.length;
      atLineStart = false;
      continue;
    }

    out.push(ch);
    atLineStart = ch === "\n";
    i += 1;
  }

  return out.join("");
}

function matchDelimiterDirective(
  sql: string,
  from: number
): { delimiter: string; nextIndex: number } | null {
  let p = from;
  while (p < sql.length && (sql[p] === " " || sql[p] === "\t")) p += 1;

  if (!/^delimiter\b/i.test(sql.slice(p, p + 9))) return null;
  p += 9;

  const wsStart = p;
  while (p < sql.length && (sql[p] === " " || sql[p] === "\t")) p += 1;
  if (p === wsStart) return null;

  const delimStart = p;
  while (
    p < sql.length &&
    sql[p] !== " " &&
    sql[p] !== "\t" &&
    sql[p] !== "\n" &&
    sql[p] !== "\r"
  ) {
    p += 1;
  }
  if (p === delimStart) return null;
  const delimiter = sql.slice(delimStart, p);

  while (p < sql.length && sql[p] !== "\n") p += 1;
  if (sql[p] === "\n") p += 1;

  return { delimiter, nextIndex: p };
}

function consumeQuoted(sql: string, from: number, quote: string): number {
  let p = from + 1;
  while (p < sql.length) {
    const c = sql[p];
    if (c === "\\" && quote !== "`") {
      p += 2;
      continue;
    }
    if (c === quote) {
      if (sql[p + 1] === quote) {
        p += 2;
        continue;
      }
      return p + 1;
    }
    p += 1;
  }
  return p;
}

function consumeLineComment(sql: string, from: number): number {
  let p = from;
  while (p < sql.length && sql[p] !== "\n") p += 1;
  if (sql[p] === "\n") p += 1;
  return p;
}

function consumeBlockComment(sql: string, from: number): number {
  let p = from + 2;
  while (p < sql.length - 1) {
    if (sql[p] === "*" && sql[p + 1] === "/") return p + 2;
    p += 1;
  }
  return sql.length;
}

function isLineCommentBoundary(ch: string | undefined): boolean {
  return ch === undefined || ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

function startsWith(sql: string, index: number, needle: string): boolean {
  if (index + needle.length > sql.length) return false;
  for (let k = 0; k < needle.length; k += 1) {
    if (sql[index + k] !== needle[k]) return false;
  }
  return true;
}
