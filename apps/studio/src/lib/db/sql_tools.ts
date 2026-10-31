import _ from 'lodash'
import { identify, Options, Dialect as IdentifierDialect } from 'sql-query-identifier'
import { IdentifyResult } from 'sql-query-identifier/lib/defines'
import { EntityFilter } from '@/store/models'
import { RoutineTypeNames } from "./models"
import { format, ParamItems } from 'sql-formatter'
import { Dialect, FormatterDialect } from '@/shared/lib/dialects/models'

export function splitQueries(queryText: string, dialect: IdentifierDialect): IdentifyResult[] {
  if(_.isEmpty(queryText.trim())) {
    return []
  }
  const { queries: result } = safelyIdentify(queryText, { dialect });
  return result;
}

// Wraps identify so a parser failure is returned instead of thrown,
// falling back to treating the whole text as a single query.
export function safelyIdentify(
  queryText: string,
  options: Options
): { queries: IdentifyResult[]; error: Error | null } {
  try {
    // We should really not be using strict mode anywhere, but I guess we can allow an override here just in case
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

// can only have positional params OR non-positional
export function canDeparameterize(params: string[]) {
  return !(params.includes('?') && params.some((val) => val != '?'));
}

export function convertParamsForReplacement(placeholders: string[], values: string[] | Record<string, string>): ParamItems | string[] {
  if (placeholders.includes('?')) {
    // Positional params: values is an ordered array, return as-is for sql-formatter.
    return values as string[];
  } else {
    // Named/numbered params: values is a record keyed by the full placeholder
    // (e.g. { ':name': "'Alice'" }). Strip the prefix so sql-formatter gets { name: "'Alice'" }.
    // Lookup is by key so duplicate placeholders in the SQL are harmless.
    return Object.fromEntries(
      Object.entries(values as Record<string, string>).map(([k, v]) => [k.slice(1), v])
    );
  }
}

export function deparameterizeQuery(queryText: string, dialect: Dialect, params: ParamItems | string[], paramTypes: Options["paramTypes"]) {
  if (dialect === 'redis') {
    // formatting breaks redis multi-line command execution
    return queryText;
  }
  // for if we want custom params in the future
  // paramTypes.custom = paramTypes.custom.map((reg: string) => ({ regex: reg }));
  const result = format(queryText, {
    language: FormatterDialect(dialect),
    paramTypes,
    params
  });
  return result;
}

export function entityFilter(rawTables: any[], allFilters: EntityFilter, matchingColumns?: (table: any) => string[] | boolean) {
  const tables = rawTables.filter((table) => {
    return (table.entityType === 'table' && allFilters.showTables &&
      ((table.parenttype != 'p' && !allFilters.showPartitions) || allFilters.showPartitions)) ||
      (table.entityType === 'view' && allFilters.showViews) ||
      (table.entityType === 'materialized-view' && allFilters.showViews) ||
      (Object.keys(RoutineTypeNames).includes(table.type) && allFilters.showRoutines)
  })

  const { filterQuery } = allFilters
  if (!filterQuery) {
    return tables
  }
  const query = filterQuery.toLowerCase()
  const seen = new Set<string>()
  const matchRank = (name: string) => {
    const value = name.toLowerCase()
    return value === query ? 0 : value.startsWith(query) ? 1 : value.includes(query) ? 2 : Infinity
  }
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
  return tables.filter((item) => {
    if (!['table', 'view', 'materialized-view'].includes(item.entityType)) return true
    const key = JSON.stringify([item.schema, item.name, item.entityType])
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).map((item) => {
    let rank = matchRank(item.name)
    if (rank === Infinity && matchingColumns) {
      const columns = matchingColumns(item)
      if (Array.isArray(columns)) {
        for (const column of columns) rank = Math.min(rank, 3 + matchRank(column))
      } else if (columns) rank = 5
    }
    return { item, rank }
  }).filter(({ rank }) => rank < Infinity).sort((a, b) =>
    a.rank - b.rank ||
    compare(a.item.name.toLowerCase(), b.item.name.toLowerCase()) ||
    compare((a.item.schema || '').toLowerCase(), (b.item.schema || '').toLowerCase()) ||
    compare(a.item.name, b.item.name) || compare(a.item.schema || '', b.item.schema || '')
  ).map(({ item }) => item)
}

// a function that takes in a string and a dialect,
// if the string is determined to be most likely a query and it is quoted, we remove the quotes,
// else we just return the trimmed query
export function removeQueryQuotes(possibleQuery: string, dialect: any): string {
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

export function isTextSelected(
  textStart: number,
  textEnd: number,
  selectionStart: number,
  selectionEnd: number
) {
  const cursorMin = Math.min(selectionStart, selectionEnd);
  const cursorMax = Math.max(selectionStart, selectionEnd);
  const queryMin = Math.min(textStart, textEnd);
  const queryMax = Math.max(textStart, textEnd);
  if (
    (cursorMin >= queryMin && cursorMin <= queryMax) ||
    (cursorMax > queryMin && cursorMax <= queryMax) ||
    (cursorMin <= queryMin && cursorMax >= queryMax)
  ) {
    return true;
  }
  return false;
}

