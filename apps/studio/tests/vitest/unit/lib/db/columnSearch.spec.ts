import { describe, expect, it } from 'vitest'
import { buildColumnSearchQuery, matchColumnResults, ColumnSearchRequests } from '../../../../../src/lib/db/columnSearch'

describe('column metadata search', () => {
  it.each(['postgresql', 'mysql', 'mariadb'])('searches metadata for %s without embedding SQL input', (dialect) => {
    const query = buildColumnSearchQuery(dialect, "café'_%")
    expect(query).toBeTruthy()
    expect(query).not.toContain("café'_%")
    expect(query.toLowerCase()).toContain('information_schema')
  })

  it('does not search unsupported databases or an empty term', () => {
    expect(buildColumnSearchQuery('sqlite', 'email')).toBeNull()
    expect(buildColumnSearchQuery('postgresql', '')).toBeNull()
  })

  it('uses the actual PostgreSQL type name for user-defined columns', () => {
    expect(buildColumnSearchQuery('postgresql', 'email')).toContain("WHEN c.data_type = 'USER-DEFINED'")
    expect(buildColumnSearchQuery('postgresql', 'email')).toContain('c.udt_name')
  })

  it('groups columns by schema and table without confusing identical names', () => {
    const rows = [
      { schemaName: 'public', tableName: 'users', columnName: 'email', dataType: 'text' },
      { schemaName: 'other', tableName: 'users', columnName: 'billing_email', dataType: 'text' },
    ]
    expect(matchColumnResults(rows, 'public', 'users').map(c => c.columnName)).toEqual(['email'])
    expect(matchColumnResults(rows, 'other', 'users').map(c => c.columnName)).toEqual(['billing_email'])
  })

  it('matches MySQL tables without a schema only in the selected database', () => {
    const rows = [{ schemaName: 'shop', tableName: 'users', columnName: 'email', dataType: 'text' }]
    expect(matchColumnResults(rows, undefined, 'users', 'shop')).toHaveLength(1)
    expect(matchColumnResults(rows, undefined, 'users', 'other')).toHaveLength(0)
  })

  it('discards old searches even when their responses arrive last', async () => {
    const requests = new ColumnSearchRequests()
    let resolveFirst: (value: string) => void
    const first = requests.run(() => new Promise<string>(resolve => { resolveFirst = resolve }))
    const second = requests.run(async () => 'new')
    expect(await second).toBe('new')
    resolveFirst('old')
    expect(await first).toBeUndefined()
  })

  it('invalidates a pending result when search is cleared', async () => {
    const requests = new ColumnSearchRequests()
    let resolve: (value: string) => void
    const pending = requests.run(() => new Promise<string>(done => { resolve = done }))
    requests.invalidate()
    resolve('old')
    expect(await pending).toBeUndefined()
  })

  it('ignores a failure from an obsolete search', async () => {
    const requests = new ColumnSearchRequests()
    let reject: (reason: Error) => void
    const pending = requests.run(() => new Promise<string>((_, fail) => { reject = fail }))
    requests.invalidate()
    reject(new Error('disconnected'))
    await expect(pending).resolves.toBeUndefined()
  })
})
