import { describe, expect, it } from 'vitest'
import { entityFilter } from '../../../../../src/lib/db/sql_tools'

describe('entity filter with column matches', () => {
  it('ranks exact, prefix and substring entity matches ahead of the best column match', () => {
    const names = ['z_contains', 'x_exactcol', 'x_prefixcol', 'x_subcol', 'x_email_suffix', 'email_tail', 'EMAIL']
    const tables = names.map(name => ({ name, schema: 'public', entityType: 'table' }))
    const filter = { filterQuery: 'email', showTables: true, showViews: true, showRoutines: true, showPartitions: false }
    const columns: Record<string, string[]> = { z_contains: ['Email'], x_exactcol: ['EMAIL'], x_prefixcol: ['email_address'], x_subcol: ['work_email'] }
    expect(entityFilter(tables, filter, (table: any) => columns[table.name] || []).map((table: any) => table.name))
      .toEqual(['EMAIL', 'email_tail', 'x_email_suffix', 'x_exactcol', 'z_contains', 'x_prefixcol', 'x_subcol'])
  })

  it('uses the entity match when a column also matches and breaks ties by name and schema', () => {
    const tables = [
      { name: 'email_archive', schema: 'zeta', entityType: 'table' },
      { name: 'email_archive', schema: 'alpha', entityType: 'table' },
      { name: 'email', schema: 'other', entityType: 'table' },
    ]
    const filter = { filterQuery: 'EMAIL', showTables: true, showViews: true, showRoutines: true, showPartitions: false }
    expect(entityFilter(tables, filter, () => ['email', 'email_address']).map((t: any) => [t.schema, t.name]))
      .toEqual([['other', 'email'], ['alpha', 'email_archive'], ['zeta', 'email_archive']])
  })

  it('preserves the original order for an empty search and returns no unrelated entities', () => {
    const tables = [{ name: 'zebra', entityType: 'table' }, { name: 'apple', entityType: 'table' }]
    const filter = { filterQuery: '', showTables: true, showViews: true, showRoutines: true, showPartitions: false }
    expect(entityFilter(tables, filter)).toEqual(tables)
    expect(entityFilter(tables, { ...filter, filterQuery: 'missing' })).toEqual([])
  })

  it('shows one result per entity while keeping same names from different schemas', () => {
    const tables = [
      { name: 'users', schema: 'public', entityType: 'table' },
      { name: 'users', schema: 'public', entityType: 'table' },
      { name: 'users', schema: 'other', entityType: 'table' },
    ]
    const filter = { filterQuery: 'user', showTables: true, showViews: true, showRoutines: true, showPartitions: false }
    expect(entityFilter(tables, filter).map((t: any) => t.schema)).toEqual(['other', 'public'])
  })

  it('preserves name ranking and appends column matches while respecting entity filters', () => {
    const tables = [
      { name: 'customers', schema: 'public', entityType: 'table' },
      { name: 'email_templates', schema: 'public', entityType: 'table' },
      { name: 'old_customers', schema: 'public', entityType: 'view' },
    ]
    const filter = { filterQuery: 'email', showTables: true, showViews: false, showRoutines: true, showPartitions: false }
    const matches = (table: any) => table.name !== 'email_templates'
    expect(entityFilter(tables, filter, matches).map((table: any) => table.name)).toEqual(['email_templates', 'customers'])
  })
})
