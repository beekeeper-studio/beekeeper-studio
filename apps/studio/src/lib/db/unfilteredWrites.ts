import { Dialect as IdentifierDialect } from 'sql-query-identifier'
import { IdentifyResult } from 'sql-query-identifier/lib/defines'

/** When the query editor warns before an UPDATE or DELETE without a WHERE clause. */
export type UnfilteredWriteWarning = 'always' | 'production' | 'never'

const WRITE_TYPES = ['UPDATE', 'DELETE']
const BACKSLASH_ESCAPES: IdentifierDialect[] = ['mysql', 'bigquery']
const POSTGRES_LIKE: IdentifierDialect[] = ['psql']
const IDENTIFIER_START = /[A-Za-z_]/
const IDENTIFIER_PART = /[A-Za-z0-9_$]/
const DOLLAR_QUOTE = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/

/** Index just past the quote that closes the quoted text opened at `start`. */
function skipQuoted(text: string, start: number, close: string, backslashEscapes: boolean): number {
  let i = start + 1
  while (i < text.length) {
    if (backslashEscapes && text[i] === '\\') {
      i += 2
      continue
    }
    if (text[i] === close) {
      // a doubled quote is an escaped quote, not the end
      if (text[i + 1] === close && close !== ']') {
        i += 2
        continue
      }
      return i + 1
    }
    i++
  }
  return text.length
}

/**
 * Whether a statement has a WHERE clause of its own: a WHERE keyword outside
 * strings, quoted identifiers, comments and parentheses. A WHERE in a subquery
 * or a CTE filters that subquery, not the rows the statement changes.
 */
export function hasOwnWhereClause(statement: string, dialect: IdentifierDialect = 'generic'): boolean {
  const backslashEscapes = BACKSLASH_ESCAPES.includes(dialect)
  let depth = 0
  let i = 0
  while (i < statement.length) {
    const char = statement[i]
    const next = statement[i + 1]

    if ((char === '-' && next === '-') || (char === '#' && dialect === 'mysql')) {
      const end = statement.indexOf('\n', i)
      i = end === -1 ? statement.length : end + 1
    } else if (char === '/' && next === '*') {
      const end = statement.indexOf('*/', i + 2)
      i = end === -1 ? statement.length : end + 2
    } else if (char === "'") {
      // Postgres E'' strings take backslash escapes
      const escapeString = POSTGRES_LIKE.includes(dialect) && /[Ee]/.test(statement[i - 1] ?? '')
      i = skipQuoted(statement, i, "'", backslashEscapes || escapeString)
    } else if (char === '"') {
      i = skipQuoted(statement, i, '"', backslashEscapes)
    } else if (char === '`') {
      i = skipQuoted(statement, i, '`', false)
    } else if (char === '[' && dialect === 'mssql') {
      i = skipQuoted(statement, i, ']', false)
    } else if (char === '$' && POSTGRES_LIKE.includes(dialect) && DOLLAR_QUOTE.test(statement.slice(i))) {
      const tag = statement.slice(i).match(DOLLAR_QUOTE)[0]
      const end = statement.indexOf(tag, i + tag.length)
      i = end === -1 ? statement.length : end + tag.length
    } else if (char === '(') {
      depth++
      i++
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
      i++
    } else if (IDENTIFIER_START.test(char)) {
      let end = i + 1
      while (end < statement.length && IDENTIFIER_PART.test(statement[end])) end++
      if (depth === 0 && statement.slice(i, end).toUpperCase() === 'WHERE') return true
      i = end
    } else {
      i++
    }
  }
  return false
}

/**
 * The UPDATE and DELETE statements that have no WHERE clause, and so can
 * change every row of their table. A LIMIT or TOP does not count as a filter:
 * it caps how many rows change, not which ones.
 */
export function findUnfilteredWrites(queries: IdentifyResult[], dialect: IdentifierDialect = 'generic'): IdentifyResult[] {
  return queries.filter((query) =>
    WRITE_TYPES.includes(query.type) && !hasOwnWhereClause(query.text, dialect)
  )
}

/** Whether to warn on a connection, given the configured setting. */
export function shouldWarnOnUnfilteredWrites(setting: unknown, isProductionConnection: boolean): boolean {
  switch (String(setting ?? 'always').trim().toLowerCase()) {
    case 'never':
      return false
    case 'production':
      return isProductionConnection
    default:
      return true
  }
}

/** One line of a statement for the warning: whitespace collapsed, long ones cut. */
export function statementExcerpt(statement: string, maxLength = 80): string {
  const line = statement.replace(/\s+/g, ' ').trim().replace(/;$/, '')
  return line.length > maxLength ? `${line.slice(0, maxLength - 1)}…` : line
}

/** The message of the warning for the given unfiltered statements. */
export function unfilteredWritesMessage(statements: IdentifyResult[]): string {
  const excerpts = statements.map((s) => statementExcerpt(s.text))
  if (excerpts.length === 1) {
    return `${excerpts[0]} has no WHERE clause, so it can change every row in the table.`
  }
  return `${excerpts.length} statements have no WHERE clause, so they can change every row in their tables: ${excerpts.join('; ')}`
}
