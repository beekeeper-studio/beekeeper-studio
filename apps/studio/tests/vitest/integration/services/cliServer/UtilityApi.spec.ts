import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { getConnectedStates, newState, removeState, state, State } from '@/handlers/handlerState'
import { ConnHandlers } from '@commercial/backend/handlers/connHandlers'
import { FavoriteQuery } from '@/common/appdb/models/favorite_query'
import { SqliteClient } from '@/lib/db/clients/sqlite'
import { CliCallContext, connectionDisplayName, formatQueryResult, UNKNOWN_CLIENT_NAME } from '@/services/cliServer/commands'
import { AuthorizedClient } from '@/services/cliServer/AuthorizedClient'
import { UtilityApi } from '@/services/UtilityApi'
import {
  MAX_QUERY_ROWS,
  METHODS,
  ApprovalRequester,
  Access,
  CliError,
  CreateTabRequest,
} from '@beekeeperstudio/cli'
import { serializeBigInt } from '@/services/plugin/utils'

async function createSqliteClient(): Promise<SqliteClient> {
  const server = { config: { client: 'sqlite', readOnlyMode: false }, db: {} } as any
  const database = { database: ':memory:', connected: false, connecting: false } as any
  const client = new SqliteClient(server, database)
  await client.connect()
  return client
}

/** A connection a test puts into handler state, as if a window had opened it. */
interface FakeConnection {
  id: string
  client: SqliteClient
  database: string | null
  config: any
}

function openConnection(id: string, client: SqliteClient, config: Record<string, any> | null): FakeConnection {
  return { id, client, database: ':memory:', config: config as any }
}

const READ_ONLY_ACCESS: Access = { queryTypes: ['select'], savedQueriesRead: false, savedQueriesWrite: false, openTabs: true }

function access(patch: Partial<Access> = {}): Access {
  return { ...READ_ONLY_ACCESS, ...patch }
}

function context(name = 'Claude Code'): CliCallContext & { hangUp(): void } {
  const caller = new AbortController()
  return { client: { name }, signal: caller.signal, hangUp: () => caller.abort() }
}

/**
 * `answer` is what the user picks in the approval dialog. Unless a test passes
 * `approved: false`, the default clients also start out approved with it.
 */
function backendFor(connections: FakeConnection[], answer: Access | null = READ_ONLY_ACCESS): FakeParts {
  const asked: ApprovalRequester[] = []
  return {
    asked,
    answer,
    openConnections: () => connections,
    askRendererForAccess: async (_connection, request) => {
      asked.push(request)
      return answer
    },
    askRendererToCreateTab: async () => 1,
    askRendererToSwitchTab: async () => {},
  }
}

/** The parts of UtilityApi that reach the app's renderers, faked by each test. */
interface FakeParts {
  /** Every approval dialog shown. */
  asked: ApprovalRequester[]
  answer: Access | null
  openConnections(): FakeConnection[]
  askRendererForAccess(connectionState: State, request: ApprovalRequester, signal: AbortSignal): Promise<Access | null>
  askRendererToCreateTab(connectionState: State, request: CreateTabRequest): Promise<number>
  askRendererToSwitchTab(connectionState: State, tabId: number): Promise<void>
}

/** UtilityApi with its connections and renderers replaced by a fake. */
class TestUtilityApi extends UtilityApi {
  readonly savedQueryChanges: number[] = []

  // Tests that are not about approval skip it by starting approved.
  constructor(private readonly fake: FakeParts, approved = true) {
    super()
    // Only this test's fake connections count as open.
    for (const connected of getConnectedStates()) {
      connected.connection = null
    }
    for (const connection of fake.openConnections()) {
      newState(connection.id)
      state(connection.id).connection = connection.client
      state(connection.id).usedConfig = connection.config
      state(connection.id).database = connection.database
      if (approved && fake.answer) {
        for (const name of [UNKNOWN_CLIENT_NAME, 'Claude Code']) {
          state(connection.id).cliClients.set(name, new AuthorizedClient(name, fake.answer))
        }
      }
    }
  }

  protected askRendererForAccess(connectionState: State, request: ApprovalRequester, signal: AbortSignal) {
    return this.fake.askRendererForAccess(connectionState, request, signal)
  }

  protected askRendererToCreateTab(connectionState: State, request: CreateTabRequest) {
    return this.fake.askRendererToCreateTab(connectionState, request)
  }

  protected askRendererToSwitchTab(connectionState: State, tabId: number) {
    return this.fake.askRendererToSwitchTab(connectionState, tabId)
  }

  protected notifySavedQueryChanged(_connectionState: State, id: number) {
    this.savedQueryChanges.push(id)
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
  let primary: FakeConnection

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
    it('lists open connections with whether the caller is approved for them', async () => {
      const second = openConnection('sid-other', other, { id: 2, name: 'Other', connectionType: 'sqlite', readOnlyMode: true })
      const api = new TestUtilityApi(backendFor([primary, second]), false)
      await api.requestApproval({ connection: 'Local Dev' }, context())
      const result = await call(api.getConnections({}, context()))
      expect(result.connections).toEqual([
        expect.objectContaining({ id: 'sid-primary', name: 'Local Dev', connectionType: 'sqlite', approved: true, readOnlyMode: false }),
        expect.objectContaining({ id: 'sid-other', name: 'Other', approved: false, readOnlyMode: true }),
      ])
      const otherClient = await call(api.getConnections({}, context('Cursor')))
      expect(otherClient.connections.map((c) => c.approved)).toEqual([false, false])
    })

    it('names unsaved connections after their type and database', async () => {
      // sqlite configs carry the default host, which means nothing for a file
      const unsaved = openConnection('sid-quick', other, { connectionType: 'sqlite', host: 'localhost', defaultDatabase: '/tmp/x.db' })
      const result = await call(new TestUtilityApi(backendFor([unsaved])).getConnections({}))
      expect(result.connections[0].name).toBe('sqlite :memory:')

      expect(connectionDisplayName(Object.assign(new State('abcdef123'), { connection: other, database: 'app', usedConfig: { connectionType: 'postgresql', host: 'db.local' } as any }))).toBe('postgresql db.local/app')
      expect(connectionDisplayName(Object.assign(new State('abcdef123'), { connection: other, database: null, usedConfig: { connectionType: 'postgresql' } as any }))).toBe('postgresql abcdef12')
      expect(connectionDisplayName(Object.assign(new State('abcdef123'), { connection: other, database: null, usedConfig: { connectionType: 'mysql', name: 'Named' } as any }))).toBe('Named')
    })

    it('reports when no connection is open at all', async () => {
      const error = await expectError(new TestUtilityApi(backendFor([])).getEntities({ entityTypes: ['table'] }), 'NO_OPEN_CONNECTIONS')
      expect(error.hint).toContain('Connect to a database')
    })

    it('needs --connection when several are open and the caller is approved for none or several', async () => {
      const second = openConnection('sid-other', other, { id: 2, name: 'Other', connectionType: 'sqlite' })
      const api = new TestUtilityApi(backendFor([primary, second]), false)
      await expectError(api.getEntities({ entityTypes: ['table'] }, context()), 'AMBIGUOUS_CONNECTION')
      await api.requestApproval({ connection: 'Other' }, context())
      await api.requestApproval({ connection: 'Local Dev' }, context())
      const error = await expectError(api.getEntities({ entityTypes: ['table'] }, context()), 'AMBIGUOUS_CONNECTION')
      expect(error.message).toContain('"Local Dev"')
      expect(error.message).toContain('"Other"')

      const byName = await call(api.getEntities({ entityTypes: ['table'], connection: 'other' }, context()))
      expect(byName.entities.map((e) => e.name)).toEqual(['widgets'])

      const byId = await call(api.getEntities({ entityTypes: ['table'], connection: 'sid-primary' }, context()))
      expect(byId.entities.map((e) => e.name)).toEqual(['orders', 'users'])

      await expectError(api.getEntities({ entityTypes: ['table'] }, context()), 'AMBIGUOUS_CONNECTION')
    })

    it('picks the one connection the caller is approved for when several are open', async () => {
      const second = openConnection('sid-other', other, { id: 2, name: 'Other', connectionType: 'sqlite' })
      const api = new TestUtilityApi(backendFor([primary, second]), false)
      await api.requestApproval({ connection: 'Other' }, context())
      const result = await call(api.getEntities({ entityTypes: ['table'] }, context()))
      expect(result.entities.map((e) => e.name)).toEqual(['widgets'])
    })

    it('rejects unknown --connection values', async () => {
      const unknown = await expectError(new TestUtilityApi(backend).getEntities({ entityTypes: ['table'], connection: 'nope' }), 'UNKNOWN_CONNECTION')
      expect(unknown.hint).toContain('"Local Dev"')
    })
  })

  describe('approval', () => {
    it('fails without approval and says how to ask for it, without showing a dialog', async () => {
      const fake = backendFor([primary])
      const api = new TestUtilityApi(fake, false)
      const error = await expectError(api.getSchemas({}, context()), 'NOT_APPROVED')
      expect(error.message).toContain('Claude Code')
      expect(error.hint).toContain('bks request-approval --connection "Local Dev"')
      expect(fake.asked).toEqual([])
    })

    it('asks once per client and connection, then remembers', async () => {
      const fake = backendFor([primary])
      const api = new TestUtilityApi(fake, false)
      const result = await call(api.requestApproval({}, context()))
      expect(result).toEqual({ newlyApproved: true, access: READ_ONLY_ACCESS })
      expect(fake.asked).toEqual([{ clientName: 'Claude Code', connectionName: 'Local Dev', readOnlyMode: false }])

      expect((await call(api.requestApproval({}, context()))).newlyApproved).toBe(false)
      await api.getSchemas({}, context())
      expect(fake.asked).toHaveLength(1)

      await expectError(api.getSchemas({}, context('Cursor')), 'NOT_APPROVED')
    })

    it('shows one dialog for requests that arrive while it is open', async () => {
      let answer: (access: Access) => void = () => undefined
      const fake = backendFor([primary])
      fake.askRendererForAccess = async (_connection, request) => {
        fake.asked.push(request)
        return new Promise((resolve) => { answer = resolve })
      }
      const api = new TestUtilityApi(fake, false)
      const both = Promise.all([api.requestApproval({}, context()), api.requestApproval({}, context())])
      await new Promise((resolve) => setTimeout(resolve, 10))
      answer(access())
      await both
      expect(fake.asked).toHaveLength(1)
    })

    it('closes the dialog once every caller waiting on it has hung up', async () => {
      let answer: (access: Access) => void = () => undefined
      let dialog: AbortSignal | null = null
      const fake = backendFor([primary])
      fake.askRendererForAccess = async (_connection, request, signal) => {
        fake.asked.push(request)
        dialog = signal
        return new Promise((resolve) => { answer = resolve })
      }
      const api = new TestUtilityApi(fake, false)
      const a = context()
      const b = context()
      const first = expectError(api.requestApproval({}, a), 'INTERNAL')
      const second = expectError(api.requestApproval({}, b), 'INTERNAL')
      await new Promise((resolve) => setTimeout(resolve, 10))

      a.hangUp()
      await first
      expect(dialog!.aborted).toBe(false)

      b.hangUp()
      await second
      expect(dialog!.aborted).toBe(true)

      // An answer that arrives after everyone left approves nothing.
      answer(access())
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(state(primary.id).cliClients.get('Claude Code')).toBeUndefined()
    })

    it('fails with ACCESS_DENIED on deny and asks again next time', async () => {
      const fake = backendFor([primary], null)
      const api = new TestUtilityApi(fake, false)
      const error = await expectError(api.requestApproval({}, context()), 'ACCESS_DENIED')
      expect(error.hint).toContain('request-approval')
      await expectError(api.getSchemas({}, context()), 'NOT_APPROVED')
      await expectError(api.requestApproval({}, context()), 'ACCESS_DENIED')
      expect(fake.asked).toHaveLength(2)
    })

    it('never grants writes on a read only connection', async () => {
      const readOnly = openConnection('sid-ro', client, { id: 5, name: 'Prod', connectionType: 'sqlite', readOnlyMode: true })
      const api = new TestUtilityApi(backendFor([readOnly], access({ queryTypes: ['select', 'update', 'anything'] })), false)
      await api.requestApproval({}, context())
      expect(state(readOnly.id).cliClients.get('Claude Code')?.access.queryTypes).toEqual(['select'])
    })
  })

  it('rejects unknown entity types', async () => {
    await expectError(new TestUtilityApi(backend).getEntities({ entityTypes: ['sequence' as any] }), 'USAGE')
  })

  it('lists schemas', async () => {
    const result = await call(new TestUtilityApi(backend).getSchemas({}))
    expect(Array.isArray(result.schemas)).toBe(true)
  })

  it('lists tables and entities', async () => {
    const tables = await call(new TestUtilityApi(backend).getEntities({ entityTypes: ['table'] }))
    expect(tables.entities).toEqual([
      { name: 'orders', entityType: 'table' },
      { name: 'users', entityType: 'table' },
    ])

    const all = await call(new TestUtilityApi(backend).getEntities({}))
    expect(all.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'users', entityType: 'table' }),
        expect.objectContaining({ name: 'recent_users', entityType: 'view' }),
      ])
    )
    expect(all.warnings).toEqual([])

    const views = await call(new TestUtilityApi(backend).getEntities({ entityTypes: ['view'] }))
    expect(views.entities).toEqual([{ name: 'recent_users', entityType: 'view' }])
  })

  describe('getTableStructure', () => {
    it('describes a table', async () => {
      const result = await call(new TestUtilityApi(backend).getTableStructure({ name: 'orders' }))
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
      const result = await call(new TestUtilityApi(backend).getTableStructure({ name: 'recent_users' }))
      expect(result.entityType).toBe('view')
      expect(result.columns.map((c) => c.name)).toEqual(['id', 'email'])
      expect(result.primaryKeys).toEqual([])
      expect(result.createScript).toMatch(/create view/i)
    })

    it('matches names case insensitively when that is unambiguous', async () => {
      const result = await call(new TestUtilityApi(backend).getTableStructure({ name: 'USERS' }))
      expect(result.name).toBe('users')
    })

    it('fails clearly for unknown names', async () => {
      const error = await expectError(new TestUtilityApi(backend).getTableStructure({ name: 'nothing' }), 'NOT_FOUND')
      expect(error.message).toContain('"nothing"')
      expect(error.hint).toContain('entities')
    })
  })

  describe('openTab', () => {
    function recording() {
      const created: { connectionState: State; request: CreateTabRequest }[] = []
      const methods = new TestUtilityApi({
        ...backend,
        askRendererToCreateTab: async (connectionState, request) => {
          created.push({ connectionState, request })
          return 7
        },
      })
      return { methods, created }
    }

    it('opens a query tab with the sql and returns its id', async () => {
      const { methods, created } = recording()
      const result: any = await methods.openTab({ tab: 'query', sql: 'select 1' })
      expect(created).toEqual([{ connectionState: state('sid-primary'), request: { tab: 'query', sql: 'select 1' } }])
      expect(result.tabId).toBe(7)
    })

    it('needs permission to open tabs', async () => {
      const created: CreateTabRequest[] = []
      const api = new TestUtilityApi({
        ...backendFor([primary], access({ openTabs: false })),
        askRendererToCreateTab: async (_connectionState, request) => {
          created.push(request)
          return 7
        },
      })
      const error = await expectError(api.openTab({ tab: 'query' }, context()), 'NOT_PERMITTED')
      expect(error.message).toContain('Claude Code')
      expect(error.hint).toContain('request-approval')
      await expectError(api.switchTab({ tabId: 1 }, context()), 'NOT_PERMITTED')
      expect(created).toEqual([])
    })

    it('opens nothing for an unknown tab type', async () => {
      const { methods, created } = recording()
      await expectError(methods.openTab({ tab: 'table' as any }), 'USAGE')
      await expectError(methods.openTab({ tab: 'chart' as any }), 'USAGE')
      expect(created).toEqual([])
    })
  })

  describe('runQuery', () => {
    it('returns rows keyed by column name', async () => {
      const result = await call(new TestUtilityApi(backend).runQuery({ sql: 'select id, email, name from users order by id' }))
      expect(result.results).toHaveLength(1)
      const [first] = result.results
      expect(first.columns).toEqual(['id', 'email', 'name'])
      expect(first.rows).toEqual([
        { id: 1, email: 'a@example.com', name: 'Ann' },
        { id: 2, email: 'b@example.com', name: null },
      ])
      expect(first).toMatchObject({ rowCount: 2, totalRowCount: 2, truncated: false, maxRows: MAX_QUERY_ROWS })
    })

    it('keeps duplicate column names apart', async () => {
      const result = await call(new TestUtilityApi(backend).runQuery({ sql: 'select 1 as x, 2 as x, 3 as x' }))
      expect(result.results[0].columns).toEqual(['x', 'x_2', 'x_3'])
      expect(result.results[0].rows).toEqual([{ x: 1, x_2: 2, x_3: 3 }])
    })

    it('returns one result per statement', async () => {
      const result = await call(new TestUtilityApi(backend).runQuery({ sql: 'select count(*) as n from users; select count(*) as n from orders' }))
      expect(result.results.map((r) => r.rows[0].n)).toEqual([2, 2])
    })

    it('caps results at the row limit', async () => {
      const extra = 5
      const sql = `with recursive seq(n) as (select 1 union all select n + 1 from seq where n < ${MAX_QUERY_ROWS + extra}) select n from seq`
      const result = await call(new TestUtilityApi(backend).runQuery({ sql }))
      const [first] = result.results
      expect(first.rowCount).toBe(MAX_QUERY_ROWS)
      expect(first.rows).toHaveLength(MAX_QUERY_ROWS)
      expect(first.totalRowCount).toBe(MAX_QUERY_ROWS + extra)
      expect(first.truncated).toBe(true)
      expect(first.rows[MAX_QUERY_ROWS - 1].n).toBe(MAX_QUERY_ROWS)
    }, 30000)

    it('serializes binary and large integer values', async () => {
      const result = await call(new TestUtilityApi(backend).runQuery({ sql: "select x'deadbeef' as blob, 9007199254740993 as big" }))
      expect(result.results[0].rows[0]).toEqual({
        blob: { type: 'binary', encoding: 'hex', data: 'deadbeef' },
        big: '9007199254740993',
      })
    })

    it('reports sql errors as QUERY_FAILED', async () => {
      const error = await expectError(new TestUtilityApi(backend).runQuery({ sql: 'select * from missing_table' }), 'QUERY_FAILED')
      expect(error.message).toContain('missing_table')
      await expectError(new TestUtilityApi(backend).runQuery({ sql: '   ' }), 'USAGE')
    })

    it('runs only the statement types the client was granted', async () => {
      const selectOnly = new TestUtilityApi(backend)
      for (const sql of [
        "insert into users (id, email) values (3, 'c@example.com')",
        "update users set name = 'x' where id = 1",
        'delete from users where id = 2',
        'create table scratch (id integer)',
        'drop table orders',
        // a read followed by a write is rejected as a whole
        "select 1; insert into users (id, email) values (4, 'd@example.com')",
      ]) {
        const error = await expectError(selectOnly.runQuery({ sql }, context()), 'NOT_PERMITTED')
        expect(error.hint).toContain('request-approval')
      }
      const check = await call(selectOnly.runQuery({ sql: 'select count(*) as n from users; select count(*) as orders from orders' }, context()))
      expect(check.results[0].rows[0].n).toBe(2)
      expect(check.results[1].rows[0].orders).toBe(2)

      const updates = new TestUtilityApi(backendFor([primary], access({ queryTypes: ['select', 'update'] })))
      const updated = await call(updates.runQuery({ sql: "update users set name = name where id = 1" }, context()))
      expect(updated.results[0].affectedRows).toBe(1)
      const denied = await expectError(updates.runQuery({ sql: 'delete from users where id = 2' }, context()), 'NOT_PERMITTED')
      expect(denied.message).toContain('delete')
      expect((denied.details as any).statements).toEqual([{ text: 'delete from users where id = 2', needs: ['delete'] }])
    })

    it('runs anything with the anything permission', async () => {
      const api = new TestUtilityApi(backendFor([primary], access({ queryTypes: ['anything'] })))
      await call(api.runQuery({ sql: 'create table scratch_anything (id integer); drop table scratch_anything' }, context()))
    })

    it('still answers reads on a read only connection', async () => {
      client.readOnlyMode = true
      try {
        const result = await call(new TestUtilityApi(backend).runQuery({ sql: 'select count(*) as n from users' }))
        expect(result.results[0].rows[0].n).toBe(2)
        const writer = new TestUtilityApi(backendFor([primary], access({ queryTypes: ['select', 'delete'] })))
        const error = await expectError(writer.runQuery({ sql: 'delete from users' }, context()), 'READ_ONLY')
        expect(error.hint).toContain('read only mode')
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

describe('cliClients', () => {
  afterEach(async () => {
    await removeState('sid-session')
  })

  it('forgets approvals when the window disconnects', async () => {
    newState('sid-session')
    state('sid-session').cliClients.set('Claude Code', new AuthorizedClient('Claude Code', access()))

    await ConnHandlers['conn/clearConnection']({ sId: 'sid-session' })
    expect(state('sid-session').cliClients.size).toBe(0)
  })
})

describe('saved queries', () => {
  let client: SqliteClient
  let primary: FakeConnection

  beforeAll(async () => {
    await TestOrmConnection.connect()
    client = await createSqliteClient()
    primary = openConnection('sid-primary', client, { id: 1, name: 'Local Dev', connectionType: 'sqlite' })
  })

  afterAll(async () => {
    await client?.disconnect()
    await TestOrmConnection.disconnect()
  })

  beforeEach(async () => {
    await FavoriteQuery.clear()
  })

  it('needs read access to list or read them, and write access to change them', async () => {
    const none = new TestUtilityApi(backendFor([primary], access()))
    await expectError(none.getSavedQueries({}, context()), 'NOT_PERMITTED')
    await expectError(none.createSavedQuery({ title: 'x', text: 'select 1' }, context()), 'NOT_PERMITTED')

    const readOnly = new TestUtilityApi(backendFor([primary], access({ savedQueriesRead: true })))
    expect((await call(readOnly.getSavedQueries({}, context()))).savedQueries).toEqual([])
    await expectError(readOnly.createSavedQuery({ title: 'x', text: 'select 1' }, context()), 'NOT_PERMITTED')
    expect(await FavoriteQuery.count()).toBe(0)
  })

  it('creates and updates them, telling the window', async () => {
    const api = new TestUtilityApi(backendFor([primary], access({ savedQueriesRead: true, savedQueriesWrite: true })))
    const created = await call(api.createSavedQuery({ title: ' Active users ', text: 'select * from users' }, context()))
    expect(created.savedQuery).toMatchObject({ title: 'Active users', text: 'select * from users', excerpt: 'select * from users' })
    const id = created.savedQuery.id

    const updated = await call(api.updateSavedQuery({ id, text: 'select id from users' }, context()))
    expect(updated.savedQuery).toMatchObject({ id, title: 'Active users', text: 'select id from users' })
    expect(api.savedQueryChanges).toEqual([id, id])

    const listed = await call(api.getSavedQueries({}, context()))
    expect(listed.savedQueries).toEqual([expect.objectContaining({ id, title: 'Active users' })])
    expect(listed.savedQueries[0].text).toBeUndefined()
    expect((await call(api.getSavedQuery({ id }, context()))).savedQuery.text).toBe('select id from users')

    await expectError(api.updateSavedQuery({ id: 9999, title: 'x' }, context()), 'NOT_FOUND')
    await expectError(api.updateSavedQuery({ id }, context()), 'USAGE')
  })
})

describe('getCliApis', () => {
  it('has a command for every CLI method', () => {
    const commands = new UtilityApi().getCliApis()
    expect(commands.map((command) => command.name)).toEqual([...METHODS])
    for (const command of commands) {
      expect(typeof command.func).toBe('function')
    }
  })
})
