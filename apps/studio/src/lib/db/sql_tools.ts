import _ from 'lodash'
import { identify, Options } from 'sql-query-identifier'
import { EntityFilter } from '@/store/models'
import { RoutineTypeNames } from "./models"
import { format } from 'sql-formatter'
import { Dialect, FormatterDialect } from '@/shared/lib/dialects/models'
import { ParamItems } from 'sql-formatter/lib/src/formatter/Params'

export function splitQueries(queryText: string, dialect) {
  if(_.isEmpty(queryText.trim())) {
    return []
  }
  const result = identify(queryText, { strict: false, dialect })
  return result
}

// can only have positional params OR non-positional
export function canDeparameterize(params: string[]) {
  return !(params.includes('?') && params.some((val) => val != '?'));
}

export function convertParamsForReplacement(placeholders: string[], values: string[]): ParamItems | string[] {
  if (placeholders.includes('?')) {
    return values;
  } else {
    // TODO (@day): this might not work with quoted params
    // this will need to be more complex if we allow truly custom params
    return placeholders.reduce((obj, val, index) => {
      obj[val.slice(1)] = values[index];
      return obj;
    }, {});
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

export function entityFilter(rawTables: any[], allFilters: EntityFilter) {
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
  const startsWithFilter = _(tables)
    .filter((item) => _.startsWith(item.name.toLowerCase(), filterQuery.toLowerCase()))
    .value()
  const containsFilter = _(tables)
    .difference(startsWithFilter)
    .filter((item) => item.name.toLowerCase().includes(filterQuery.toLowerCase()))
    .value()
  return _.concat(startsWithFilter, containsFilter)
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
  if (isQuoted && identify(unquotedQuery, { strict: false, dialect })?.some((res) => res.type != 'UNKNOWN')) {
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

