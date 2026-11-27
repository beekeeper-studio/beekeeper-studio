import _ from 'lodash'
import { identify, Options, Dialect as IdentifierDialect, StatementType } from 'sql-query-identifier'
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

/** A statement type that may run, or ANYTHING for all of them. */
export type Permission = StatementType | 'ANYTHING'

export interface StatementPermissions {
  /** The statement as written, for error messages. */
  text: string
  needs: Permission[]
}

/** Thrown when a query has statements the given permissions do not cover. */
export class QueryPermissionError extends Error {
  /** The permissions missing across all statements. */
  readonly needs: Permission[]

  constructor(readonly statements: StatementPermissions[]) {
    const needs = _.uniq(statements.flatMap((s) => s.needs))
    super(`Not allowed to run ${needs.join(', ')} statements on this connection.`)
    this.name = 'QueryPermissionError'
    this.needs = needs
  }
}

const TRANSACTION_CONTROL = ['BEGIN_TRANSACTION', 'COMMIT', 'ROLLBACK']

const EXPLAIN_ANALYZE = /^\s*explain\s+(\([^)]*\banaly[sz]e\b[^)]*\)|(verbose\s+)?analy[sz]e\b)/i
const EXPLAIN_OPTIONS = /^\s*explain\s+(\([^)]*\)\s*|(analy[sz]e|verbose|buffers|costs|format\s+\w+)\s+)*/i

// A WITH query can carry an INSERT/UPDATE/DELETE in a CTE and still identify as SELECT.
const CTE_WRITES: [RegExp, Permission][] = [
  [/\bupdate\s+[\w."`[\]]+\s+set\b/i, 'UPDATE'],
  [/\bdelete\s+from\b/i, 'DELETE'],
  [/\binsert\s+into\b/i, 'INSERT'],
  [/\bmerge\s+into\b/i, 'MERGE'],
]

/** Checks queries against the statement types a client may run. */
export class QueryPermissionChecker {
  constructor(
    private readonly dialect: IdentifierDialect,
    private readonly permissions: Permission[]
  ) {}

  /** @throws {QueryPermissionError} when the permissions do not cover every statement in `sql` */
  assert(sql: string): void {
    const disallowed = this.disallowedStatements(sql)
    if (disallowed.length > 0) {
      throw new QueryPermissionError(disallowed)
    }
  }

  /** The statements the permissions do not cover, each with the permissions it is missing. */
  private disallowedStatements(sql: string): StatementPermissions[] {
    if (this.permissions.includes('ANYTHING')) {
      return []
    }
    return this.permissionsFor(sql)
      .map((s) => ({ text: s.text, needs: s.needs.filter((n) => !this.permissions.includes(n)) }))
      .filter((s) => s.needs.length > 0)
  }

  /** What each statement in `sql` needs to be allowed to run. */
  private permissionsFor(sql: string): StatementPermissions[] {
    if (!sql.trim()) {
      return []
    }
    const { queries } = safelyIdentify(sql, { dialect: this.dialect })
    return queries.map((statement) => ({ text: statement.text, needs: this.statementNeeds(statement) }))
  }

  private statementNeeds(statement: IdentifyResult): Permission[] {
    const type = statement.type ?? 'UNKNOWN'
    if (TRANSACTION_CONTROL.includes(type)) {
      return []
    }
    if (type === 'EXPLAIN' && EXPLAIN_ANALYZE.test(statement.text)) {
      const inner = statement.text.replace(EXPLAIN_OPTIONS, '')
      const innerNeeds = this.permissionsFor(inner).flatMap((s) => s.needs)
      // EXPLAIN ANALYZE runs the statement, so the statement itself has to be allowed too.
      return _.uniq(['EXPLAIN', ...innerNeeds])
    }
    if (type === 'SELECT' && /^\s*with\b/i.test(statement.text)) {
      const writes = CTE_WRITES.filter(([pattern]) => pattern.test(statement.text)).map(([, needs]) => needs)
      return _.uniq(['SELECT', ...writes])
    }
    return [type]
  }
}
