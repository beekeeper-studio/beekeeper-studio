import _ from 'lodash'
import { TableKey } from '@shared/lib/dialects/models'

// Mirror of the 'launch' icon used to follow a foreign key out of a cell
export const REFERENCED_BY_ICON = 'call_received'

export interface ReferencedByFilter {
  field: string
  type: '='
  value: unknown
  op: 'AND'
}

/**
 * Pairs each column in the referencing table with the column it points at in
 * this table, eg [{ from: 'order_id', to: 'id' }]. Returns nothing for a key
 * that can't be a real foreign key, so it gets no link rather than a wrong
 * filter. BigQuery can't pair composite keys yet and reports every
 * combination of columns, which shows up here as a repeated column.
 */
export function keyColumnPairs(key: TableKey): { from: string, to: string }[] {
  const from = _.castArray(key.fromColumn ?? [])
  const to = _.castArray(key.toColumn ?? [])
  const valid = from.length > 0 &&
    from.length === to.length &&
    [...from, ...to].every((column) => !_.isEmpty(column)) &&
    _.uniq(from).length === from.length &&
    _.uniq(to).length === to.length
  return valid ? from.map((column, i) => ({ from: column, to: to[i] })) : []
}

/** Groups incoming keys by the column in this table that they reference */
export function groupIncomingKeysByColumn(keys: TableKey[]): Record<string, TableKey[]> {
  const result: Record<string, TableKey[]> = {}
  keys.forEach((key) => {
    keyColumnPairs(key).forEach(({ to }) => {
      if (!result[to]) result[to] = []
      result[to].push(key)
    })
  })
  return result
}

/**
 * Filters for the referencing table that find the rows pointing at `rowData`.
 * Returns null when a referenced value is missing, as nothing can reference it.
 */
export function buildReferencedByFilters(key: TableKey, rowData: Record<string, unknown>): ReferencedByFilter[] | null {
  const pairs = keyColumnPairs(key)
  if (!pairs.length) return null

  const filters: ReferencedByFilter[] = pairs.map(({ from, to }) => ({
    field: from,
    type: '=',
    value: rowData?.[to],
    op: 'AND',
  }))

  return filters.some((f) => _.isNil(f.value)) ? null : filters
}

/** The referencing table, schema-qualified when it lives in another schema */
export function referencedByTable(key: TableKey): string {
  return key.fromSchema && key.toSchema && key.fromSchema !== key.toSchema
    ? `${key.fromSchema}.${key.fromTable}`
    : key.fromTable
}

/** The referencing table's foreign key columns, eg "order_id, line_no" */
export function referencedByColumns(key: TableKey): string {
  return _.castArray(key.fromColumn).join(', ')
}

/** eg "order_items (order_id)" */
export function referencedByLabel(key: TableKey): string {
  return `${referencedByTable(key)} (${referencedByColumns(key)})`
}

/**
 * Short labels for a menu: just the table, plus the columns only where one
 * table references this one more than once (eg films.language_id and
 * films.original_language_id), so every entry can be told apart.
 */
export function referencedByMenuLabels(keys: TableKey[]): { table: string, columns?: string }[] {
  const counts = _.countBy(keys, referencedByTable)
  return keys.map((key) => {
    const table = referencedByTable(key)
    return counts[table] > 1 ? { table, columns: referencedByColumns(key) } : { table }
  })
}

export function referencedByTooltip(keys: TableKey[]): string {
  const tables = _.uniq(keys.map((key) => key.fromTable))
  const shown = tables.slice(0, 3)
  const rest = tables.length - shown.length
  const list = rest > 0
    ? `${shown.join(', ')}, and ${rest} more`
    : shown.join(', ').replace(/, (?![\s\S]*, )/, tables.length > 2 ? ', and ' : ' and ')
  return `Referenced by ${list}`
}
