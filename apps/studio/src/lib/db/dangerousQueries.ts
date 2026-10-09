import _ from 'lodash'
import { Dialect as IdentifierDialect } from 'sql-query-identifier'
import { safelyIdentify } from './sql_tools'

export type DangerousQueryType = 'DELETE' | 'UPDATE'

export interface DangerousQuery {
  type: DangerousQueryType
  text: string
}

const MUTATION_TYPES: string[] = ['DELETE', 'UPDATE']
const WORD_CHAR = /[A-Za-z0-9_$@]/

/**
 * Finds UPDATE and DELETE statements without a WHERE clause, which change
 * every record in the table they target.
 */
export function findDangerousQueries(queryText: string, dialect: IdentifierDialect): DangerousQuery[] {
  if (!queryText?.trim()) return []
  const { queries } = safelyIdentify(queryText, { dialect })
  return queries
    .filter((q) => MUTATION_TYPES.includes(q.type) && !hasTopLevelWhere(q.text, dialect))
    .map((q) => ({ type: q.type as DangerousQueryType, text: q.text }))
}

export function describeDangerousQueries(queries: DangerousQuery[]): { title: string, detail: string } {
  const actions = _.uniq(queries.map((q) => q.type.toLowerCase())).join(' and ')
  if (queries.length === 1) {
    return {
      title: 'You did not scope this query',
      detail: `This will ${actions} every record on this table.`,
    }
  }
  return {
    title: `You did not scope ${queries.length} queries`,
    detail: `These queries will ${actions} every record on their tables.`,
  }
}

/**
 * True if the statement has a WHERE keyword outside of comments, strings,
 * quoted identifiers and parentheses. A WHERE inside parentheses belongs to a
 * subquery or CTE and doesn't limit the rows the statement changes.
 */
export function hasTopLevelWhere(sql: string, dialect: IdentifierDialect): boolean {
  const hashComments = dialect === 'mysql' || dialect === 'bigquery'
  const backslashEscapes = dialect === 'mysql' || dialect === 'bigquery'
  const bracketIdentifiers = dialect === 'mssql' || dialect === 'sqlite'
  const dollarQuotes = dialect !== 'mysql'

  let depth = 0
  let i = 0
  while (i < sql.length) {
    const char = sql[i]
    const next = sql[i + 1]
    const dollarTag = dollarQuotes && char === '$' ? dollarTagAt(sql, i) : null

    if ((char === '-' && next === '-') || (hashComments && char === '#')) {
      i = indexAfter(sql, '\n', i + 1)
    } else if (char === '/' && next === '*') {
      i = indexAfter(sql, '*/', i + 2)
    } else if (char === "'" || char === '"') {
      i = skipQuoted(sql, i, char, backslashEscapes)
    } else if (char === '`') {
      i = skipQuoted(sql, i, char, false)
    } else if (bracketIdentifiers && char === '[') {
      i = indexAfter(sql, ']', i + 1)
    } else if (dollarTag) {
      i = indexAfter(sql, dollarTag, i + dollarTag.length)
    } else if (char === '(') {
      depth++
      i++
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
      i++
    } else if (WORD_CHAR.test(char)) {
      const start = i
      while (i < sql.length && WORD_CHAR.test(sql[i])) i++
      if (depth === 0 && sql.slice(start, i).toLowerCase() === 'where') return true
    } else {
      i++
    }
  }
  return false
}

// Index just past the next `search` at or after `from`, or the end of the
// text if it's unterminated.
function indexAfter(sql: string, search: string, from: number): number {
  const idx = sql.indexOf(search, from)
  return idx === -1 ? sql.length : idx + search.length
}

function skipQuoted(sql: string, start: number, quote: string, backslashEscapes: boolean): number {
  let i = start + 1
  while (i < sql.length) {
    if (backslashEscapes && sql[i] === '\\') {
      i += 2
    } else if (sql[i] === quote && sql[i + 1] === quote) {
      i += 2
    } else if (sql[i] === quote) {
      return i + 1
    } else {
      i++
    }
  }
  return sql.length
}

// Postgres-style dollar quote opener ($$ or $tag$), but not a $1 parameter.
function dollarTagAt(sql: string, i: number): string | null {
  const match = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 64))
  return match ? match[0] : null
}
