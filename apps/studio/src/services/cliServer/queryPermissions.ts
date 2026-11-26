import _ from 'lodash'
import { Dialect as IdentifierDialect } from 'sql-query-identifier'
import { IdentifyResult } from 'sql-query-identifier/lib/defines'
import { QueryPermission } from '@beekeeperstudio/cli'
import { safelyIdentify } from '@/lib/db/sql_tools'

export interface StatementPermissions {
  /** The statement as written, for error messages. */
  text: string
  needs: QueryPermission[]
}

const TRANSACTION_CONTROL = ['BEGIN_TRANSACTION', 'COMMIT', 'ROLLBACK', 'TRANSACTION']

const EXPLAIN_ANALYZE = /^\s*explain\s+(\([^)]*\banaly[sz]e\b[^)]*\)|(verbose\s+)?analy[sz]e\b)/i
const EXPLAIN_OPTIONS = /^\s*explain\s+(\([^)]*\)\s*|(analy[sz]e|verbose|buffers|costs|format\s+\w+)\s+)*/i

// A WITH query can carry an INSERT/UPDATE/DELETE in a CTE and still identify as SELECT.
const CTE_WRITES: [RegExp, QueryPermission][] = [
  [/\bupdate\s+[\w."`[\]]+\s+set\b/i, 'update'],
  [/\bdelete\s+from\b/i, 'delete'],
  [/\b(insert\s+into|merge\s+into)\b/i, 'anything'],
]

function statementNeeds(statement: IdentifyResult, dialect: IdentifierDialect): QueryPermission[] {
  const type = statement.type?.toUpperCase() ?? 'UNKNOWN'
  if (TRANSACTION_CONTROL.includes(type)) {
    return []
  }
  if (type === 'EXPLAIN') {
    if (!EXPLAIN_ANALYZE.test(statement.text)) {
      return ['select']
    }
    const inner = statement.text.replace(EXPLAIN_OPTIONS, '')
    const innerNeeds = permissionsFor(inner, dialect).flatMap((s) => s.needs)
    // EXPLAIN ANALYZE runs the statement, so the statement itself has to be allowed too.
    return _.uniq(['explain-analyze', ...innerNeeds])
  }
  if (type === 'SELECT' && /^\s*with\b/i.test(statement.text)) {
    const writes = CTE_WRITES.filter(([pattern]) => pattern.test(statement.text)).map(([, needs]) => needs)
    if (writes.length > 0) {
      return _.uniq(['select', ...writes])
    }
  }
  const executionType = statement.executionType?.toUpperCase()
  if (type === 'SELECT' || executionType === 'LISTING' || executionType === 'INFORMATION') {
    return ['select']
  }
  if (type === 'UPDATE') {
    return ['update']
  }
  if (type === 'DELETE') {
    return ['delete']
  }
  if (type.startsWith('ALTER_')) {
    return ['alter']
  }
  return ['anything']
}

/** What each statement in `sql` needs to be allowed to run. */
export function permissionsFor(sql: string, dialect: IdentifierDialect): StatementPermissions[] {
  if (!sql.trim()) {
    return []
  }
  const { queries } = safelyIdentify(sql, { dialect })
  return queries.map((statement) => ({ text: statement.text, needs: statementNeeds(statement, dialect) }))
}

/** The statements `granted` does not cover, each with the permissions it is missing. */
export function disallowedStatements(
  sql: string,
  dialect: IdentifierDialect,
  granted: QueryPermission[]
): StatementPermissions[] {
  if (granted.includes('anything')) {
    return []
  }
  return permissionsFor(sql, dialect)
    .map((s) => ({ text: s.text, needs: s.needs.filter((n) => !granted.includes(n)) }))
    .filter((s) => s.needs.length > 0)
}
