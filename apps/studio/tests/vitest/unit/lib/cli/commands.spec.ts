import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqliteClient } from '@/lib/db/clients/sqlite'
import { CliBackend, CliOpenConnection, connectionDisplayName, executeCliRequest, formatQueryResult, uniqueColumnNames } from '@/lib/cli/commands'
import { CLI_MAX_QUERY_ROWS, CLI_PROTOCOL_VERSION, CliCommandArgs, CliCommandName, CliResponse } from '@/cli/protocol'

async function createSqliteClient(): Promise<SqliteClient> {
  const server = { config: { client: 'sqlite', readOnlyMode: false }, db: {} } as any
  const database = { database: ':memory:', connected: false, connecting: false } as any
  const client = new SqliteClient(server, database)
  await client.connect()
  return client
}

function openConnection(id: string, client: SqliteClient, config: Record<string, any> | null): CliOpenConnection {
  return { id, client, database: ':memory:', config: config as any }
}

function backendFor(connections: CliOpenConnection[], enabledIds: string[] = connections.map((c) => c.id)): CliBackend {
  return {
    openConnections: () => connections,
    isCliEnabled: async (connection) => enabledIds.includes(connection.id),
  }
}

function request(command: CliCommandName, args: CliCommandArgs = {}) {
  return { version: CLI_PROTOCOL_VERSION, command, args }
}

function expectError(response: CliResponse, code: string) {
  expect(response.ok).toBe(false)
  if (response.ok) return null
  expect(response.error.code).toBe(code)
  return response.error
}

function expectOk(response: CliResponse): any {
  if (!response.ok) throw new Error(`expected success, got ${response.error.code}: ${response.error.message}`)
  return response.result
}

describe('executeCliRequest', () => {
  let client: SqliteClient
  let other: SqliteClient
  let backend: CliBackend
  let primary: CliOpenConnection

  beforeAll(async () => {
    client = await createSqliteClient()
    for (const sql of [
      'create table users (id integer primary key, email text not null unique, name text, created_at text default current_timestamp)',
      'create table orders (id integer primary key, user_id integer not null references users(id), total real)',
      'create index orders_user_id on orders(user_id)',
      "create view recent_users as select id, email from users where created_at > '2000-01-01'",
      "insert into users (id, email, name) values (1, 'a@example.com', 'Ann'), (2, 'b@example.com', null)",
      'insert into orders (id, user_id, total) values (10, 1, 9.5), (11, 2, 20)',
    ]) {
      await client.executeQuery(sql)
    }
    other = await createSqliteClient()
    await other.executeQuery('create table widgets (id integer primary key)')

    primary = openConnection('sid-primary', client, { id: 1, name: 'Local Dev', connectionType: 'sqlite', readOnlyMode: false, defaultDatabase: ':memory:' })
    backend = backendFor([primary])
  })

  afterAll(async () => {
    await client?.disconnect()
    await other?.disconnect()
  })

  describe('connection selection', () => {
    it('lists open connections with their cli status', async () => {
      const second = openConnection('sid-other', other, { id: 2, name: 'Other', connectionType: 'sqlite', readOnlyMode: true })
      const result = expectOk(await executeCliRequest(backendFor([primary, second], ['sid-primary']), request('connections')))
      expect(result.connections).toEqual([
        expect.objectContaining({ id: 'sid-primary', name: 'Local Dev', connectionType: 'sqlite', cliEnabled: true, readOnlyMode: false }),
        expect.objectContaining({ id: 'sid-other', name: 'Other', cliEnabled: false, readOnlyMode: true }),
      ])
    })

    it('names unsaved connections after their type and database', async () => {
      // sqlite configs carry the default host, which means nothing for a file
      const unsaved = openConnection('sid-quick', other, { connectionType: 'sqlite', host: 'localhost', defaultDatabase: '/tmp/x.db' })
      const result = expectOk(await executeCliRequest(backendFor([unsaved]), request('connections')))
      expect(result.connections[0].name).toBe('sqlite :memory:')

      expect(connectionDisplayName({ id: 'abcdef123', client: other, database: 'app', config: { connectionType: 'postgresql', host: 'db.local' } as any })).toBe('postgresql db.local/app')
      expect(connectionDisplayName({ id: 'abcdef123', client: other, database: null, config: { connectionType: 'postgresql' } as any })).toBe('postgresql abcdef12')
      expect(connectionDisplayName({ id: 'abcdef123', client: other, database: null, config: { connectionType: 'mysql', name: 'Named' } as any })).toBe('Named')
    })

    it('explains how to enable the cli when nothing is enabled', async () => {
      const error = expectError(await executeCliRequest(backendFor([primary], []), request('list-tables')), 'CLI_DISABLED')
      expect(error.message).toContain('"Local Dev"')
      expect(error.hint).toContain('Enable CLI Access')
      expect(error.hint).toContain('enableForAllConnections = true')
      expect((error.details as any).connections[0]).toMatchObject({ name: 'Local Dev', cliEnabled: false })
    })

    it('reports when no connection is open at all', async () => {
      const error = expectError(await executeCliRequest(backendFor([]), request('list-tables')), 'NO_OPEN_CONNECTIONS')
      expect(error.hint).toContain('Connect to a database')
    })

    it('needs --connection when more than one connection is enabled', async () => {
      const second = openConnection('sid-other', other, { id: 2, name: 'Other', connectionType: 'sqlite' })
      const both = backendFor([primary, second])
      const error = expectError(await executeCliRequest(both, request('list-tables')), 'AMBIGUOUS_CONNECTION')
      expect(error.message).toContain('"Local Dev"')
      expect(error.message).toContain('"Other"')

      const byName = expectOk(await executeCliRequest(both, request('list-tables', { connection: 'other' })))
      expect(byName.connection).toEqual({ id: 'sid-other', name: 'Other' })
      expect(byName.entities.map((e) => e.name)).toEqual(['widgets'])

      const byId = expectOk(await executeCliRequest(both, request('list-tables', { connection: 'sid-primary' })))
      expect(byId.entities.map((e) => e.name)).toEqual(['orders', 'users'])
    })

    it('rejects unknown and disabled --connection values', async () => {
      const second = openConnection('sid-other', other, { id: 2, name: 'Other', connectionType: 'sqlite' })
      const both = backendFor([primary, second], ['sid-primary'])
      const unknown = expectError(await executeCliRequest(both, request('list-tables', { connection: 'nope' })), 'UNKNOWN_CONNECTION')
      expect(unknown.hint).toContain('"Local Dev"')
      expectError(await executeCliRequest(both, request('list-tables', { connection: 'Other' })), 'CLI_DISABLED')
    })
  })

  it('rejects malformed requests', async () => {
    expectError(await executeCliRequest(backend, { version: 1, command: 'drop-everything' as any, args: {} }), 'USAGE')
    expectError(await executeCliRequest(backend, request('list-entities', { entityTypes: ['sequence' as any] })), 'USAGE')
  })

  it('lists schemas', async () => {
    const result = expectOk(await executeCliRequest(backend, request('list-schemas')))
    expect(result.connection).toEqual({ id: 'sid-primary', name: 'Local Dev' })
    expect(Array.isArray(result.schemas)).toBe(true)
  })

  it('lists tables and entities', async () => {
    const tables = expectOk(await executeCliRequest(backend, request('list-tables')))
    expect(tables.entityTypes).toEqual(['table'])
    expect(tables.entities).toEqual([
      { schema: null, name: 'orders', entityType: 'table' },
      { schema: null, name: 'users', entityType: 'table' },
    ])

    const all = expectOk(await executeCliRequest(backend, request('list-entities')))
    expect(all.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'users', entityType: 'table' }),
        expect.objectContaining({ name: 'recent_users', entityType: 'view' }),
      ])
    )
    expect(all.warnings).toEqual([])

    const views = expectOk(await executeCliRequest(backend, request('list-entities', { entityTypes: ['view'] })))
    expect(views.entities).toEqual([{ schema: null, name: 'recent_users', entityType: 'view' }])
  })

  describe('structure', () => {
    it('describes a table', async () => {
      const result = expectOk(await executeCliRequest(backend, request('structure', { name: 'orders' })))
      expect(result.entityType).toBe('table')
      expect(result.name).toBe('orders')
      expect(result.primaryKeys).toEqual(['id'])
      expect(result.columns).toEqual([
        expect.objectContaining({ name: 'id', dataType: expect.stringMatching(/integer/i), primaryKey: true }),
        expect.objectContaining({ name: 'user_id', primaryKey: false, nullable: false }),
        expect.objectContaining({ name: 'total', primaryKey: false }),
      ])
      expect(result.indexes.map((i) => i.name)).toContain('orders_user_id')
      expect(result.relations).toEqual([
        expect.objectContaining({ fromColumn: 'user_id', toTable: 'users', toColumn: 'id' }),
      ])
      expect(result.triggers).toEqual([])
      expect(result.createScript).toContain('CREATE TABLE')
      expect(result.warnings).toEqual([])
    })

    it('describes a view', async () => {
      const result = expectOk(await executeCliRequest(backend, request('structure', { name: 'recent_users' })))
      expect(result.entityType).toBe('view')
      expect(result.columns.map((c) => c.name)).toEqual(['id', 'email'])
      expect(result.primaryKeys).toEqual([])
      expect(result.createScript).toMatch(/create view/i)
    })

    it('matches names case insensitively when that is unambiguous', async () => {
      const result = expectOk(await executeCliRequest(backend, request('structure', { name: 'USERS' })))
      expect(result.name).toBe('users')
    })

    it('fails clearly for unknown names', async () => {
      const error = expectError(await executeCliRequest(backend, request('structure', { name: 'nothing' })), 'NOT_FOUND')
      expect(error.message).toContain('"nothing"')
      expect(error.hint).toContain('list-entities')
    })
  })

  describe('query', () => {
    it('returns rows keyed by column name', async () => {
      const result = expectOk(await executeCliRequest(backend, request('query', { sql: 'select id, email, name from users order by id' })))
      expect(result.connection.name).toBe('Local Dev')
      expect(result.results).toHaveLength(1)
      const [first] = result.results
      expect(first.columns).toEqual(['id', 'email', 'name'])
      expect(first.rows).toEqual([
        { id: 1, email: 'a@example.com', name: 'Ann' },
        { id: 2, email: 'b@example.com', name: null },
      ])
      expect(first).toMatchObject({ rowCount: 2, totalRowCount: 2, truncated: false, maxRows: CLI_MAX_QUERY_ROWS })
    })

    it('keeps duplicate column names apart', async () => {
      const result = expectOk(await executeCliRequest(backend, request('query', { sql: 'select 1 as x, 2 as x, 3 as x' })))
      expect(result.results[0].columns).toEqual(['x', 'x_2', 'x_3'])
      expect(result.results[0].rows).toEqual([{ x: 1, x_2: 2, x_3: 3 }])
    })

    it('returns one result per statement', async () => {
      const result = expectOk(await executeCliRequest(backend, request('query', { sql: 'select count(*) as n from users; select count(*) as n from orders' })))
      expect(result.results.map((r) => r.rows[0].n)).toEqual([2, 2])
    })

    it('caps results at the row limit', async () => {
      const extra = 5
      const sql = `with recursive seq(n) as (select 1 union all select n + 1 from seq where n < ${CLI_MAX_QUERY_ROWS + extra}) select n from seq`
      const result = expectOk(await executeCliRequest(backend, request('query', { sql })))
      const [first] = result.results
      expect(first.rowCount).toBe(CLI_MAX_QUERY_ROWS)
      expect(first.rows).toHaveLength(CLI_MAX_QUERY_ROWS)
      expect(first.totalRowCount).toBe(CLI_MAX_QUERY_ROWS + extra)
      expect(first.truncated).toBe(true)
      expect(first.rows[CLI_MAX_QUERY_ROWS - 1].n).toBe(CLI_MAX_QUERY_ROWS)
    }, 30000)

    it('serializes binary and large integer values', async () => {
      const result = expectOk(await executeCliRequest(backend, request('query', { sql: "select x'deadbeef' as blob, 9007199254740993 as big" })))
      expect(result.results[0].rows[0]).toEqual({
        blob: { type: 'binary', encoding: 'hex', data: 'deadbeef' },
        big: '9007199254740993',
      })
    })

    it('reports sql errors as QUERY_FAILED', async () => {
      const error = expectError(await executeCliRequest(backend, request('query', { sql: 'select * from missing_table' })), 'QUERY_FAILED')
      expect(error.message).toContain('missing_table')
      expect((error.details as any).connection).toEqual({ id: 'sid-primary', name: 'Local Dev' })
      expectError(await executeCliRequest(backend, request('query', { sql: '   ' })), 'USAGE')
    })

    it('rejects writes even when the connection is not read only', async () => {
      expect(client.readOnlyMode).toBe(false)
      for (const sql of [
        "insert into users (id, email) values (3, 'c@example.com')",
        "update users set name = 'x' where id = 1",
        'delete from users where id = 2',
        'create table scratch (id integer)',
        'drop table orders',
        // a read followed by a write is rejected as a whole
        "select 1; insert into users (id, email) values (4, 'd@example.com')",
      ]) {
        const error = expectError(await executeCliRequest(backend, request('query', { sql })), 'READ_ONLY')
        expect(error.hint).toContain('read only')
      }
      const check = expectOk(await executeCliRequest(backend, request('query', { sql: 'select count(*) as n from users; select count(*) as orders from orders' })))
      expect(check.results[0].rows[0].n).toBe(2)
      expect(check.results[1].rows[0].orders).toBe(2)
      expect(expectOk(await executeCliRequest(backend, request('list-tables'))).entities.map((e) => e.name)).toEqual(['orders', 'users'])
    })

    it('still answers reads on a read only connection', async () => {
      client.readOnlyMode = true
      try {
        const result = expectOk(await executeCliRequest(backend, request('query', { sql: 'select count(*) as n from users' })))
        expect(result.results[0].rows[0].n).toBe(2)
        expectError(await executeCliRequest(backend, request('query', { sql: 'delete from users' })), 'READ_ONLY')
      } finally {
        client.readOnlyMode = false
      }
    })
  })
})

describe('formatQueryResult', () => {
  it('maps field ids to column names', () => {
    const result = formatQueryResult({
      command: 'SELECT',
      fields: [{ id: 'c0', name: 'id' }, { id: 'c1', name: 'id' }],
      rows: [{ c0: 1, c1: 2 }],
      rowCount: 1,
    })
    expect(result.columns).toEqual(['id', 'id_2'])
    expect(result.rows).toEqual([{ id: 1, id_2: 2 }])
    expect(result.truncated).toBe(false)
  })

  it('falls back to row keys when there are no fields', () => {
    const result = formatQueryResult({ rows: [{ a: 1 }, { a: 2 }] })
    expect(result.columns).toEqual(['a'])
    expect(result.rowCount).toBe(2)
    expect(result.command).toBeNull()
  })

  it('handles array rows and statements without rows', () => {
    expect(formatQueryResult({ fields: [{ id: '0', name: 'a' }], rows: [[1]] }).rows).toEqual([{ a: 1 }])
    const update = formatQueryResult({ command: 'UPDATE', affectedRows: 3 })
    expect(update).toMatchObject({ command: 'UPDATE', columns: [], rows: [], rowCount: 0, affectedRows: 3 })
  })

  it('keeps a client side truncation visible', () => {
    const result = formatQueryResult({ rows: [{ a: 1 }], truncated: true, totalRowCount: 50000, rowCount: 1 })
    expect(result.truncated).toBe(true)
    expect(result.totalRowCount).toBe(50000)
  })
})

describe('uniqueColumnNames', () => {
  it('suffixes duplicates in order', () => {
    expect(uniqueColumnNames(['a', 'b', 'a', 'a'])).toEqual(['a', 'b', 'a_2', 'a_3'])
    expect(uniqueColumnNames([undefined as any, undefined as any])).toEqual(['', '_2'])
  })
})
