import { describe, expect, it } from 'vitest'
import { entityFilter } from '../../../../../src/lib/db/sql_tools'

describe('entity filter with column matches', () => {
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
