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

function columnList(columns: string | string[] | null | undefined): string[] {
  return _.compact(_.castArray(columns ?? []))
}

/**
 * Pairs each column in the referencing table with the column it points at in
 * this table, eg [{ from: 'order_id', to: 'id' }]
 */
export function keyColumnPairs(key: TableKey): { from: string, to: string }[] {
  const from = columnList(key.fromColumn)
  const to = columnList(key.toColumn)
  if (!from.length || from.length !== to.length) return []
  return from.map((column, i) => ({ from: column, to: to[i] }))
}

/**
 * Some drivers (SQLite, BigQuery, Redshift) report each column of a composite
 * foreign key as its own key with a shared constraint name. Combine them so
 * the filter uses every column, not just one.
 */
export function mergeCompositeKeyParts(keys: TableKey[]): TableKey[] {
  const result: TableKey[] = []
  const byConstraint = new Map<string, TableKey>()

  keys.forEach((key) => {
    if (key.isComposite || _.isNil(key.constraintName)) {
      result.push(key)
      return
    }

    const id = JSON.stringify([key.fromSchema, key.fromTable, key.constraintName])
    const existing = byConstraint.get(id)
    if (!existing) {
      const copy = { ...key }
      byConstraint.set(id, copy)
      result.push(copy)
      return
    }

    // keep empty referenced columns in place so the pairs stay lined up
    existing.isComposite = true
    existing.fromColumn = [..._.castArray(existing.fromColumn), ..._.castArray(key.fromColumn)]
    existing.toColumn = [..._.castArray(existing.toColumn), ..._.castArray(key.toColumn)]
  })

  return result
}

/**
 * Some drivers (eg SQLite with `REFERENCES orders`) leave the referenced
 * column empty when the foreign key points at the primary key. Fill it in, and
 * drop any key we can't map column-for-column.
 */
export function normalizeIncomingKeys(keys: TableKey[], primaryKeys: string[] = []): TableKey[] {
  return mergeCompositeKeyParts(keys ?? [])
    .map((key) => {
      if (columnList(key.toColumn).length) return key
      const toColumn = primaryKeys.length === 1 ? primaryKeys[0] : [...primaryKeys]
      return { ...key, toColumn }
    })
    .filter((key) => keyColumnPairs(key).length > 0)
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

/** eg "order_items (order_id)", schema-qualified when it lives elsewhere */
export function referencedByLabel(key: TableKey): string {
  const table = key.fromSchema && key.toSchema && key.fromSchema !== key.toSchema
    ? `${key.fromSchema}.${key.fromTable}`
    : key.fromTable
  return `${table} (${columnList(key.fromColumn).join(', ')})`
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
