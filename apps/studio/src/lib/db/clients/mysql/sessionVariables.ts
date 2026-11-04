import mysql from "mysql2";
import { MysqlSessionVariable } from "@/lib/db/types";

// System variable names, optionally component-scoped (eg `validate_password.length`).
const VARIABLE_NAME = /^[A-Za-z_][A-Za-z0-9_$]*(\.[A-Za-z_][A-Za-z0-9_$]*)?$/;

// Numbers and single words (`utf8mb4_unicode_520_ci`, `ON`, `DEFAULT`) are sent
// unquoted, so numeric variables and keywords keep working.
const UNQUOTED_VALUE = /^(-?\d+(\.\d+)?|\w+)$/;

function formatValue(raw: string): string {
  const value = (raw ?? "").trim();
  if (UNQUOTED_VALUE.test(value)) return value;

  // Anything else becomes a string literal. Strip quotes the user typed so
  // `'+00:00'` and `+00:00` both end up as '+00:00'.
  const quoted = value.match(/^(['"])([\s\S]*)\1$/);
  return mysql.escape(quoted ? quoted[2] : value);
}

/**
 * Builds a single `SET SESSION ...` statement for the configured variables, or
 * null when there's nothing to set. Rows without a name are ignored.
 */
export function buildSessionVariablesQuery(
  variables?: MysqlSessionVariable[] | null
): string | null {
  const assignments = (variables ?? [])
    .filter((v) => v?.name?.trim())
    .map(({ name, value }) => {
      const trimmed = name.trim();
      if (!VARIABLE_NAME.test(trimmed)) {
        throw new Error(`Invalid session variable name: ${trimmed}`);
      }
      return `SESSION ${trimmed} = ${formatValue(value)}`;
    });

  return assignments.length ? `SET ${assignments.join(", ")}` : null;
}

/**
 * Parses JDBC-style session variables (`a=1,b='x,y'`). Pairs are separated by
 * commas or semicolons outside of quotes.
 */
export function parseSessionVariables(text: string): MysqlSessionVariable[] {
  const pairs: string[] = [];
  let current = "";
  let quote: string | null = null;

  for (const char of text ?? "") {
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === "'" || char === '"') {
      quote = char;
    } else if (char === "," || char === ";") {
      pairs.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  pairs.push(current);

  return pairs
    .filter((pair) => pair.includes("="))
    .map((pair) => {
      const idx = pair.indexOf("=");
      return { name: pair.slice(0, idx).trim(), value: pair.slice(idx + 1).trim() };
    })
    .filter((v) => v.name);
}

/**
 * Reads the `sessionVariables` query parameter from a connection URL. The raw
 * query string is used because generic URL parsers split on the nested `=`
 * and `,`, and treat `+` as a space.
 */
export function sessionVariablesFromUrl(url: string): MysqlSessionVariable[] {
  const query = url.split("?").slice(1).join("?").split("#")[0];
  for (const pair of query.split("&")) {
    const idx = pair.indexOf("=");
    if (idx < 0 || pair.slice(0, idx).toLowerCase() !== "sessionvariables") continue;

    const raw = pair.slice(idx + 1);
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      // leave malformed escapes as-is
    }
    return parseSessionVariables(decoded);
  }
  return [];
}
