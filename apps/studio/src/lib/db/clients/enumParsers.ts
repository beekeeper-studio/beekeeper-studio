// Helpers for pulling the allowed values out of a column's enum type definition.
// Each database encodes enums differently in the type string its catalog returns,
// so these turn that raw type into the list the UI uses to build a dropdown. They
// return undefined for anything that isn't an enum, so callers can apply them
// unconditionally to every column's data type.

/**
 * Parse a quoted, comma-separated enum definition where single quotes inside a
 * value are escaped by doubling (`''`). Covers MySQL/MariaDB (`enum('a','b')`)
 * and DuckDB (`ENUM('a', 'b', 'c')`). Returns undefined for non-enum types
 * (including MySQL's `set(...)`).
 */
export function parseQuotedEnumValues(columnType?: string | null): string[] | undefined {
  if (!columnType) return undefined;
  const match = /^enum\((.*)\)$/i.exec(columnType.trim());
  if (!match) return undefined;

  const body = match[1];
  const values: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (inQuote) {
      if (char === "'") {
        if (body[i + 1] === "'") {
          // doubled single quote -> literal quote
          current += "'";
          i++;
        } else {
          inQuote = false;
        }
      } else {
        current += char;
      }
    } else if (char === "'") {
      inQuote = true;
    } else if (char === ",") {
      values.push(current);
      current = "";
    }
    // ignore whitespace between items when outside quotes
  }
  values.push(current);

  return values;
}

/**
 * Parse a ClickHouse enum definition, e.g. `Enum8('a' = 1, 'b' = 2)` or
 * `Enum16(...)`, optionally wrapped in `Nullable(...)` / `LowCardinality(...)`.
 * The labels are single-quoted string literals with backslash escaping; the
 * integer mappings are unquoted and ignored. Returns undefined for non-enum types.
 */
export function parseClickHouseEnumValues(columnType?: string | null): string[] | undefined {
  if (!columnType) return undefined;
  const open = /Enum(?:8|16)\(/i.exec(columnType);
  if (!open) return undefined;

  const values: string[] = [];
  let current = "";
  let inQuote = false;
  let depth = 1;

  for (let i = open.index + open[0].length; i < columnType.length && depth > 0; i++) {
    const char = columnType[i];
    if (inQuote) {
      if (char === "\\") {
        // backslash escape -> take the next char literally
        current += columnType[i + 1] ?? "";
        i++;
      } else if (char === "'") {
        inQuote = false;
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    } else if (char === "'") {
      inQuote = true;
      current = "";
    } else if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth--;
    }
    // unquoted integer mappings, '=', commas and spaces are ignored
  }

  return values.length ? values : undefined;
}
