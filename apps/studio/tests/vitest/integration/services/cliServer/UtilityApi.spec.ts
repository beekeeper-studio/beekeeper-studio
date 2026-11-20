import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { SqliteClient } from '@/lib/db/clients/sqlite'
import { CliOpenConnection, connectionDisplayName, formatQueryResult, uniqueColumnNames } from '@/services/cliServer/commands'
import { UtilityApi } from '@/services/UtilityApi'
import { BksConfig } from '@/common/bksConfig/BksConfigProvider'
import { CLI_MAX_QUERY_ROWS, CLI_METHODS, CliError, CliCreateTabRequest, CliTabSummary } from '@/cli/protocol'
import { serializeBigInt } from '@/services/plugin/utils'

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

function backendFor(connections: CliOpenConnection[], enabledIds: string[] = connections.map((c) => c.id)): FakeParts {
  return {
    openConnections: () => connections,
    resolveCliEnabled: async (connection) => enabledIds.includes(connection.id),
    askRendererToCreateTab: async () => ({ tabId: '1', title: 'Query #1', tabType: 'query' }),
    askRendererToSwitchTab: async (_connection, tabId) => ({ tabId, title: 'Query #1', tabType: 'query' }),
  }
}

/** The parts of UtilityApi that reach the app's renderers, faked by each test. */
interface FakeParts extends Pick<UtilityApi, 'resolveCliEnabled'> {
  openConnections(): CliOpenConnection[]
  askRendererToCreateTab(connection: CliOpenConnection, request: CliCreateTabRequest): Promise<CliTabSummary>
  askRendererToSwitchTab(connection: CliOpenConnection, tabId: string): Promise<CliTabSummary>
}

/** UtilityApi with its connections and renderers replaced by a fake. */
class TestUtilityApi extends UtilityApi {
  constructor(private readonly fake: FakeParts) {
    // resolveCliEnabled is faked, so the config is never read.
    super({ config: {} as BksConfig })
  }

  protected openConnections() {
    return this.fake.openConnections()
  }

  resolveCliEnabled(connection: CliOpenConnection) {
    return this.fake.resolveCliEnabled(connection)
  }

  protected askRendererToCreateTab(connection: CliOpenConnection, request: CliCreateTabRequest) {
    return this.fake.askRendererToCreateTab(connection, request)
  }

  protected askRendererToSwitchTab(connection: CliOpenConnection, tabId: string) {
    return this.fake.askRendererToSwitchTab(connection, tabId)
  }
}

/** Results as the server sends them over the wire. */
async function call(promise: Promise<unknown>): Promise<any> {
  return JSON.parse(JSON.stringify(await promise, (_key, value) => serializeBigInt(value)))
}

async function expectError(promise: Promise<unknown>, code: string): Promise<CliError> {
  const error = await promise.then(() => null, (e) => e)
  expect(error?.code).toBe(code)
  return error
}

describe('UtilityApi', () => {
  let client: SqliteClient
  let other: SqliteClient
  let backend: FakeParts
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
      const result = await call(new TestUtilityApi(backendFor([primary, second], ['sid-primary'])).connections({}))
      expect(result.connections).toEqual([
        expect.objectContaining({ id: 'sid-primary', name: 'Local Dev', connectionType: 'sqlite', cliEnabled: true, readOnlyMode: false }),
        expect.objectContaining({ id: 'sid-other', name: 'Other', cliEnabled: false, readOnlyMode: true }),
      ])
    })

    it('names unsaved connections after their type and database', async () => {
      // sqlite configs carry the default host, which means nothing for a file
      const unsaved = openConnection('sid-quick', other, { connectionType: 'sqlite', host: 'localhost', defaultDatabase: '/tmp/x.db' })
      const result = await call(new TestUtilityApi(backendFor([unsaved])).connections({}))
      expect(result.connections[0].name).toBe('sqlite :memory:')

      expect(connectionDisplayName({ id: 'abcdef123', client: other, database: 'app', config: { connectionType: 'postgresql', host: 'db.local' } as any })).toBe('postgresql db.local/app')
      expect(connectionDisplayName({ id: 'abcdef123', client: other, database: null, config: { connectionType: 'postgresql' } as any })).toBe('postgresql abcdef12')
      expect(connectionDisplayName({ id: 'abcdef123', client: other, database: null, config: { connectionType: 'mysql', name: 'Named' } as any })).toBe('Named')
    })

    it('explains how to enable the cli when nothing is enabled', async () => {
      const error = await expectError(new TestUtilityApi(backendFor([primary], [])).entities({ entityTypes: ['table'] }), 'CLI_DISABLED')
      expect(error.message).toContain('"Local Dev"')
      expect(error.hint).toContain('Enable CLI Access')
      expect(error.hint).toContain('enableForAllConnections = true')
      expect((error.details as any).connections[0]).toMatchObject({ name: 'Local Dev', cliEnabled: false })
    })

    it('reports when no connection is open at all', async () => {
      const error = await expectError(new TestUtilityApi(backendFor([])).entities({ entityTypes: ['table'] }), 'NO_OPEN_CONNECTIONS')
      expect(error.hint).toContain('Connect to a database')
    })

    it('needs --connection when more than one connection is enabled', async () => {
      const second = openConnection('sid-other', other, { id: 2, name: 'Other', connectionType: 'sqlite' })
      const both = backendFor([primary, second])
      const error = await expectError(new TestUtilityApi(both).entities({ entityTypes: ['table'] }), 'AMBIGUOUS_CONNECTION')
      expect(error.message).toContain('"Local Dev"')
      expect(error.message).toContain('"Other"')

      const byName = await call(new TestUtilityApi(both).entities({ entityTypes: ['table'], connection: 'other' }))
      expect(byName.connection).toEqual({ id: 'sid-other', name: 'Other' })
      expect(byName.entities.map((e) => e.name)).toEqual(['widgets'])

      const byId = await call(new TestUtilityApi(both).entities({ entityTypes: ['table'], connection: 'sid-primary' }))
      expect(byId.entities.map((e) => e.name)).toEqual(['orders', 'users'])
    })

    it('rejects unknown and disabled --connection values', async () => {
      const second = openConnection('sid-other', other, { id: 2, name: 'Other', connectionType: 'sqlite' })
      const both = backendFor([primary, second], ['sid-primary'])
      const unknown = await expectError(new TestUtilityApi(both).entities({ entityTypes: ['table'], connection: 'nope' }), 'UNKNOWN_CONNECTION')
      expect(unknown.hint).toContain('"Local Dev"')
      await expectError(new TestUtilityApi(both).entities({ entityTypes: ['table'], connection: 'Other' }), 'CLI_DISABLED')
    })
  })

  it('rejects unknown entity types', async () => {
    await expectError(new TestUtilityApi(backend).entities({ entityTypes: ['sequence' as any] }), 'USAGE')
  })

  it('lists schemas', async () => {
    const result = await call(new TestUtilityApi(backend).schemas({}))
    expect(result.connection).toEqual({ id: 'sid-primary', name: 'Local Dev' })
    expect(Array.isArray(result.schemas)).toBe(true)
  })

  it('lists tables and entities', async () => {
    const tables = await call(new TestUtilityApi(backend).entities({ entityTypes: ['table'] }))
    expect(tables.entities).toEqual([
      { schema: null, name: 'orders', entityType: 'table' },
      { schema: null, name: 'users', entityType: 'table' },
    ])

    const all = await call(new TestUtilityApi(backend).entities({}))
    expect(all.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'users', entityType: 'table' }),
        expect.objectContaining({ name: 'recent_users', entityType: 'view' }),
      ])
    )
    expect(all.warnings).toEqual([])

    const views = await call(new TestUtilityApi(backend).entities({ entityTypes: ['view'] }))
    expect(views.entities).toEqual([{ schema: null, name: 'recent_users', entityType: 'view' }])
  })

  describe('structure', () => {
    it('describes a table', async () => {
      const result = await call(new TestUtilityApi(backend).structure({ name: 'orders' }))
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
      const result = await call(new TestUtilityApi(backend).structure({ name: 'recent_users' }))
      expect(result.entityType).toBe('view')
      expect(result.columns.map((c) => c.name)).toEqual(['id', 'email'])
      expect(result.primaryKeys).toEqual([])
      expect(result.createScript).toMatch(/create view/i)
    })

    it('matches names case insensitively when that is unambiguous', async () => {
      const result = await call(new TestUtilityApi(backend).structure({ name: 'USERS' }))
      expect(result.name).toBe('users')
    })

    it('fails clearly for unknown names', async () => {
      const error = await expectError(new TestUtilityApi(backend).structure({ name: 'nothing' }), 'NOT_FOUND')
      expect(error.message).toContain('"nothing"')
      expect(error.hint).toContain('entities')
    })
  })

  describe('createTab', () => {
    function recording() {
      const created: { id: string; request: CliCreateTabRequest }[] = []
      const methods = new TestUtilityApi({
        ...backend,
        askRendererToCreateTab: async (connection, request) => {
          created.push({ id: connection.id, request })
          return { tabId: '7', title: 'Query #1', tabType: 'query' }
        },
      })
      return { methods, created }
    }

    it('opens a query tab with the sql and returns its id', async () => {
      const { methods, created } = recording()
      const result: any = await methods.createTab({ tab: 'query', sql: 'select 1' })
      expect(created).toEqual([{ id: 'sid-primary', request: { tab: 'query', sql: 'select 1' } }])
      expect(result.tabId).toBe('7')
    })

    it('opens nothing for an unknown tab type', async () => {
      const { methods, created } = recording()
      await expectError(methods.createTab({ tab: 'table' as any }), 'USAGE')
      await expectError(methods.createTab({ tab: 'chart' as any }), 'USAGE')
      expect(created).toEqual([])
    })
  })

  describe('query', () => {
    it('returns rows keyed by column name', async () => {
      const result = await call(new TestUtilityApi(backend).query({ sql: 'select id, email, name from users order by id' }))
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
      const result = await call(new TestUtilityApi(backend).query({ sql: 'select 1 as x, 2 as x, 3 as x' }))
      expect(result.results[0].columns).toEqual(['x', 'x_2', 'x_3'])
      expect(result.results[0].rows).toEqual([{ x: 1, x_2: 2, x_3: 3 }])
    })

    it('returns one result per statement', async () => {
      const result = await call(new TestUtilityApi(backend).query({ sql: 'select count(*) as n from users; select count(*) as n from orders' }))
      expect(result.results.map((r) => r.rows[0].n)).toEqual([2, 2])
    })

    it('caps results at the row limit', async () => {
      const extra = 5
      const sql = `with recursive seq(n) as (select 1 union all select n + 1 from seq where n < ${CLI_MAX_QUERY_ROWS + extra}) select n from seq`
      const result = await call(new TestUtilityApi(backend).query({ sql }))
      const [first] = result.results
      expect(first.rowCount).toBe(CLI_MAX_QUERY_ROWS)
      expect(first.rows).toHaveLength(CLI_MAX_QUERY_ROWS)
      expect(first.totalRowCount).toBe(CLI_MAX_QUERY_ROWS + extra)
      expect(first.truncated).toBe(true)
      expect(first.rows[CLI_MAX_QUERY_ROWS - 1].n).toBe(CLI_MAX_QUERY_ROWS)
    }, 30000)

    it('serializes binary and large integer values', async () => {
      const result = await call(new TestUtilityApi(backend).query({ sql: "select x'deadbeef' as blob, 9007199254740993 as big" }))
      expect(result.results[0].rows[0]).toEqual({
        blob: { type: 'binary', encoding: 'hex', data: 'deadbeef' },
        big: '9007199254740993',
      })
    })

    it('reports sql errors as QUERY_FAILED', async () => {
      const error = await expectError(new TestUtilityApi(backend).query({ sql: 'select * from missing_table' }), 'QUERY_FAILED')
      expect(error.message).toContain('missing_table')
      expect((error.details as any).connection).toEqual({ id: 'sid-primary', name: 'Local Dev' })
      await expectError(new TestUtilityApi(backend).query({ sql: '   ' }), 'USAGE')
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
        const error = await expectError(new TestUtilityApi(backend).query({ sql }), 'READ_ONLY')
        expect(error.hint).toContain('read only')
      }
      const check = await call(new TestUtilityApi(backend).query({ sql: 'select count(*) as n from users; select count(*) as orders from orders' }))
      expect(check.results[0].rows[0].n).toBe(2)
      expect(check.results[1].rows[0].orders).toBe(2)
      expect((await call(new TestUtilityApi(backend).entities({ entityTypes: ['table'] }))).entities.map((e) => e.name)).toEqual(['orders', 'users'])
    })

    it('still answers reads on a read only connection', async () => {
      client.readOnlyMode = true
      try {
        const result = await call(new TestUtilityApi(backend).query({ sql: 'select count(*) as n from users' }))
        expect(result.results[0].rows[0].n).toBe(2)
        await expectError(new TestUtilityApi(backend).query({ sql: 'delete from users' }), 'READ_ONLY')
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

function connection(config: Record<string, any> | null): CliOpenConnection {
  return { id: 'sid', client: {} as any, database: null, config: config as any }
}

function utilityApi(enableForAllConnections: boolean): UtilityApi {
  const config = { cli: { enableForAllConnections } } as BksConfig
  return new UtilityApi({ config })
}

async function saveConnection(cliEnabled: boolean): Promise<SavedConnection> {
  const saved = new SavedConnection()
  saved.connectionType = 'sqlite'
  saved.defaultDatabase = ':memory:'
  saved.name = 'CLI Connection'
  saved.cliEnabled = cliEnabled
  await saved.save()
  return saved
}

describe('resolveCliEnabled', () => {
  beforeAll(async () => {
    await TestOrmConnection.connect()
  })

  afterAll(async () => {
    await TestOrmConnection.disconnect()
  })

  beforeEach(async () => {
    await SavedConnection.clear()
  })

  it('is true for every connection when the ini setting is on', async () => {
    const saved = await saveConnection(false)
    const api = utilityApi(true)
    expect(await api.resolveCliEnabled(connection({ id: saved.id, cliEnabled: false }))).toBe(true)
    expect(await api.resolveCliEnabled(connection(null))).toBe(true)
  })

  it('uses the latest saved copy of a local saved connection', async () => {
    const saved = await saveConnection(true)
    const api = utilityApi(false)
    expect(await api.resolveCliEnabled(connection({ id: saved.id, workspaceId: -1, cliEnabled: false }))).toBe(true)

    saved.cliEnabled = false
    await saved.save()
    expect(await api.resolveCliEnabled(connection({ id: saved.id, cliEnabled: true }))).toBe(false)
  })

  it('falls back to the connected config when the saved row is gone', async () => {
    const api = utilityApi(false)
    expect(await api.resolveCliEnabled(connection({ id: 9999, cliEnabled: true }))).toBe(true)
    expect(await api.resolveCliEnabled(connection({ id: 9999, cliEnabled: false }))).toBe(false)
  })

  it('does not look up cloud workspace connections locally', async () => {
    const saved = await saveConnection(true)
    const api = utilityApi(false)
    expect(await api.resolveCliEnabled(connection({ id: saved.id, workspaceId: 42, cliEnabled: false }))).toBe(false)
  })

  it('is false for unsaved connections without the flag and for missing configs', async () => {
    const api = utilityApi(false)
    expect(await api.resolveCliEnabled(connection({ connectionType: 'sqlite' }))).toBe(false)
    expect(await api.resolveCliEnabled(connection({ connectionType: 'sqlite', cliEnabled: true }))).toBe(true)
    expect(await api.resolveCliEnabled(connection(null))).toBe(false)
  })
})

describe('getCliApis', () => {
  it('has a command for every CLI method', () => {
    const commands = utilityApi(false).getCliApis()
    expect(commands.map((command) => command.name)).toEqual([...CLI_METHODS])
    for (const command of commands) {
      expect(typeof command.func).toBe('function')
    }
  })
})
