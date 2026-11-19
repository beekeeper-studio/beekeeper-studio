import { identify, Options } from 'sql-query-identifier'
import { Dialect, IdentifyResult } from 'sql-query-identifier/lib/defines';

export function safelyIdentify(
  queryText: string,
  options: Options
): { queries: IdentifyResult[]; error: Error | null } {
  try {
    return { queries: identify(queryText, { strict: false, ...options }), error: null }
  } catch (error) {
    const fallback: IdentifyResult = {
      start: 0,
      end: queryText.length - 1,
      text: queryText,
      type: "UNKNOWN",
      executionType: "UNKNOWN",
      parameters: [],
      tables: [],
      columns: [],
    }
    return { queries: [fallback], error: error as Error }
  }
}

// Redis scripts have one command per line and no statement terminator, so a
// semicolon-based identifier would treat the whole script as one query. Split
// the way the Redis client runs a script instead: one query per non-empty
// line, skipping `#` comment lines. Offsets refer to the original text.
export function splitRedisCommands(text: string): IdentifyResult[] {
  const queries: IdentifyResult[] = [];
  const linePattern = /[^\r\n]+/g;
  let match: RegExpExecArray | null;
  while ((match = linePattern.exec(text)) !== null) {
    const command = match[0].trim();
    if (!command || command.startsWith("#")) continue;
    const start = match.index + match[0].indexOf(command);
    queries.push({
      start,
      end: start + command.length - 1,
      text: command,
      type: "UNKNOWN",
      executionType: "UNKNOWN",
      parameters: [],
      tables: [],
      columns: [],
    });
  }
  return queries;
}

// a function that takes in a string and a dialect,
// if the string is determined to be most likely a query and it is quoted, we remove the quotes,
// else we just return the trimmed query
export function removeQueryQuotes(possibleQuery: string, dialect: Dialect): string {
  // ensure there's no leading/trailing whitespace before we make our checks
  possibleQuery = possibleQuery.trim();

  const quotes = ["'", '"', '`'];
  const first = possibleQuery[0], last = possibleQuery[possibleQuery.length - 1];
  const isQuoted = quotes.includes(first) && quotes.includes(last) && first === last;
  const unquotedQuery = possibleQuery.slice(1, possibleQuery.length - 1);

  // if the query is quoted and we can identify at least one valid sql statement, we'll unquote it.
  const { queries } = safelyIdentify(unquotedQuery, { dialect });
  if (isQuoted && queries?.some((res) => res.type != 'UNKNOWN')) {
    return unquotedQuery;
  }

  return possibleQuery;
}
