import { dbtimeout } from "@tests/lib/db"
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers"
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient"
import { createServer } from "@commercial/backend/lib/db/server"
import { setupDB } from "./dynamodb/setupDb"
import { DatabaseElement, IamAuthType } from "@/lib/db/types"

describe('DynamoDB', () => {
  jest.setTimeout(dbtimeout);

  let container: StartedTestContainer
  let connection: BasicDatabaseClient<any>
  let endpoint: string

  beforeAll(async () => {
    container = await new GenericContainer('amazon/dynamodb-local:latest')
      .withName(`test-dynamodb-${Date.now()}`)
      .withExposedPorts(8000)
      .withStartupTimeout(dbtimeout)
      // The image has no health-check binary, so wait for the TCP port then poll
      // ListTables once afterward to make sure the JVM is actually accepting
      // requests.
      .withWaitStrategy(Wait.forListeningPorts())
      .start()

    endpoint = `http://${container.getHost()}:${container.getMappedPort(8000)}`

    // Belt-and-suspenders: the port can open before the JVM is ready for commands.
    {
      const { DynamoDBClient: Probe, ListTablesCommand } = await import('@aws-sdk/client-dynamodb')
      const probe = new Probe({
        region: 'us-east-1',
        endpoint,
        credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
      })
      const deadline = Date.now() + 30_000
      while (true) {
        try {
          await probe.send(new ListTablesCommand({}))
          break
        } catch (err) {
          if (Date.now() > deadline) throw err
          await new Promise((r) => setTimeout(r, 500))
        }
      }
      probe.destroy()
    }

    await setupDB(endpoint)

    const config: any = {
      client: 'dynamodb',
      readOnlyMode: false,
      iamAuthOptions: {
        authType: IamAuthType.Key,
        accessKeyId: 'local',
        secretAccessKey: 'local',
        awsRegion: 'us-east-1',
        iamAuthenticationEnabled: true,
      },
      dynamoDbOptions: { endpoint },
    }

    const server = createServer(config)
    connection = server.createConnection('us-east-1')
    await connection.connect()
  })

  afterAll(async () => {
    if (connection) await connection.disconnect()
    if (container) await container.stop()
  })

  describe('Schema introspection', () => {
    it('lists seeded tables', async () => {
      const tables = await connection.listTables()
      const names = tables.map((t) => t.name).sort()
      expect(names).toEqual(expect.arrayContaining(['Events', 'Users']))
    })

    it('lists table columns with primary-key flags', async () => {
      const cols = await connection.listTableColumns('Users')
      const byName = Object.fromEntries(cols.map((c: any) => [c.columnName, c]))
      expect(byName.id).toBeDefined()
      expect(byName.id.primaryKey).toBe(true)
      expect(byName.name).toBeDefined()
      expect(byName.email).toBeDefined()
      expect(byName.name.primaryKey).toBe(false)
    })

    it('returns composite keys for tables with both partition and sort keys', async () => {
      const pks = await connection.getPrimaryKeys('Events')
      expect(pks.map((p: any) => p.columnName).sort()).toEqual(['ts', 'userId'])
    })

    it('lists GSIs as secondary indexes', async () => {
      const indexes = await connection.listTableIndexes('Users')
      const byName = Object.fromEntries(indexes.map((i: any) => [i.name, i]))
      expect(byName.PRIMARY).toBeDefined()
      expect(byName.PRIMARY.primary).toBe(true)
      expect(byName.byEmail).toBeDefined()
      expect(byName.byEmail.columns.map((c: any) => c.name)).toContain('email')
    })

    it('returns table properties including item count and status', async () => {
      const props = await connection.getTableProperties('Users')
      expect(props).toBeDefined()
      expect(props.description).toMatch(/Status: ACTIVE/)
      expect(props.indexes.length).toBeGreaterThan(0)
      expect(props.relations).toEqual([])
    })

    it('reports a version string mentioning the endpoint', async () => {
      const v = await connection.versionString()
      expect(v).toMatch(/DynamoDB/)
    })
  })

  describe('selectTop filter operators', () => {
    it('handles = and !=', async () => {
      const eq = await connection.selectTop('Users', 0, 100, [], [{ field: 'name', type: '=', value: 'Alice' }])
      expect(eq.result.map((r: any) => r.name)).toEqual(['Alice'])

      const neq = await connection.selectTop('Users', 0, 100, [], [{ field: 'name', type: '!=', value: 'Alice' }])
      expect(neq.result.map((r: any) => r.name).sort()).toEqual(['Bob', 'Charlie', 'Dawn', 'Eve'])
    })

    it('handles numeric comparisons', async () => {
      const gt = await connection.selectTop('Users', 0, 100, [], [{ field: 'age', type: '>=', value: 40 }])
      expect(gt.result.map((r: any) => r.age).sort()).toEqual([40, 45])

      const lt = await connection.selectTop('Users', 0, 100, [], [{ field: 'age', type: '<', value: 30 }])
      expect(lt.result.map((r: any) => r.age)).toEqual([25])
    })

    it('handles IN', async () => {
      const result = await connection.selectTop('Users', 0, 100, [], [{ field: 'name', type: 'in', value: ['Alice', 'Bob'] }])
      expect(result.result.map((r: any) => r.name).sort()).toEqual(['Alice', 'Bob'])
    })

    it('handles contains via like', async () => {
      const result = await connection.selectTop('Users', 0, 100, [], [{ field: 'email', type: 'like', value: 'example.com' }])
      expect(result.result.length).toBe(5)
    })

    it('handles is / is not for optional attributes', async () => {
      await connection.executeApplyChanges({
        inserts: [{ table: 'Users', data: [{ id: 'has-nickname', email: 'nick@example.com', name: 'Nick', nickname: 'N' }] }],
        updates: [],
        deletes: [],
      })
      try {
        const hasAttr = await connection.selectTop('Users', 0, 100, [], [{ field: 'nickname', type: 'is not', value: null }])
        expect(hasAttr.result.map((r: any) => r.id)).toEqual(['has-nickname'])

        const missingAttr = await connection.selectTop('Users', 0, 100, [], [{ field: 'nickname', type: 'is', value: null }])
        expect(missingAttr.result.map((r: any) => r.id)).not.toContain('has-nickname')
      } finally {
        await connection.executeApplyChanges({
          inserts: [],
          updates: [],
          deletes: [{ table: 'Users', primaryKeys: [{ column: 'id', value: 'has-nickname' }] }],
        })
      }
    })

    it('handles OR chaining', async () => {
      const result = await connection.selectTop('Users', 0, 100, [], [
        { field: 'name', type: '=', value: 'Alice' },
        { field: 'name', type: '=', value: 'Bob', op: 'OR' },
      ])
      expect(result.result.map((r: any) => r.name).sort()).toEqual(['Alice', 'Bob'])
    })

    it('honors a column projection', async () => {
      const result = await connection.selectTop('Users', 0, 100, [{ field: 'age', dir: 'ASC' }], [], undefined, ['id', 'name'])
      expect(result.result.length).toBe(5)
      for (const row of result.result) {
        expect(Object.keys(row).sort()).toEqual(['id', 'name'])
      }
    })
  })

  describe('mutations', () => {
    it('inserts rows', async () => {
      await connection.executeApplyChanges({
        inserts: [{ table: 'Users', data: [{ id: 'u6', email: 'frank@example.com', name: 'Frank', age: 50 }] }],
        updates: [],
        deletes: [],
      })
      const result = await connection.selectTop('Users', 0, 100, [], [{ field: 'id', type: '=', value: 'u6' }])
      expect(result.result.length).toBe(1)
      expect(result.result[0].name).toBe('Frank')
    })

    it('updates rows with single-column primary key', async () => {
      await connection.executeApplyChanges({
        inserts: [],
        updates: [{
          table: 'Users',
          column: 'age',
          value: 99,
          primaryKeys: [{ column: 'id', value: 'u1' }],
        }],
        deletes: [],
      })
      const result = await connection.selectTop('Users', 0, 100, [], [{ field: 'id', type: '=', value: 'u1' }])
      expect(result.result[0].age).toBe(99)
    })

    it('updates rows on a composite partition+sort key', async () => {
      await connection.executeApplyChanges({
        inserts: [],
        updates: [{
          table: 'Events',
          column: 'kind',
          value: 'touched',
          primaryKeys: [
            { column: 'userId', value: 'u1' },
            { column: 'ts', value: 1000 },
          ],
        }],
        deletes: [],
      })
      const result = await connection.selectTop('Events', 0, 100, [], [
        { field: 'userId', type: '=', value: 'u1' },
        { field: 'ts', type: '=', value: 1000, op: 'AND' },
      ])
      expect(result.result[0].kind).toBe('touched')
    })

    it('deletes composite-key rows', async () => {
      await connection.executeApplyChanges({
        inserts: [{ table: 'Events', data: [{ userId: 'delete-me', ts: 1, kind: 'x' }] }],
        updates: [],
        deletes: [],
      })
      await connection.executeApplyChanges({
        inserts: [],
        updates: [],
        deletes: [{
          table: 'Events',
          primaryKeys: [
            { column: 'userId', value: 'delete-me' },
            { column: 'ts', value: 1 },
          ],
        }],
      })
      const result = await connection.selectTop('Events', 0, 100, [], [{ field: 'userId', type: '=', value: 'delete-me' }])
      expect(result.result.length).toBe(0)
    })

    it('inserts batches larger than the 25-item BatchWriteItem limit', async () => {
      const tableName = `BatchTest_${Date.now()}`
      await connection.createTable({ table: tableName })
      try {
        const rows = Array.from({ length: 60 }, (_, i) => ({ id: `row-${i}`, value: i }))
        await connection.insertRows([{ table: tableName, data: rows }])
        const result = await connection.selectTop(tableName, 0, 1000, [], [])
        expect(result.result.length).toBe(60)
      } finally {
        await connection.dropElement(tableName, DatabaseElement.TABLE)
      }
    })
  })

  describe('pagination', () => {
    const tableName = `Paginated_${Date.now()}`

    beforeAll(async () => {
      await connection.createTable({ table: tableName })
      const rows = Array.from({ length: 60 }, (_, i) => ({
        id: `item-${String(i).padStart(3, '0')}`,
        n: i,
      }))
      await connection.insertRows([{ table: tableName, data: rows }])
    })

    afterAll(async () => {
      await connection.dropElement(tableName, DatabaseElement.TABLE).catch(() => {})
    })

    it('slices a large dataset by offset', async () => {
      const first = await connection.selectTop(tableName, 0, 25, [{ field: 'n', dir: 'ASC' }], [])
      const second = await connection.selectTop(tableName, 25, 25, [{ field: 'n', dir: 'ASC' }], [])
      const third = await connection.selectTop(tableName, 50, 25, [{ field: 'n', dir: 'ASC' }], [])

      expect(first.result.length).toBe(25)
      expect(second.result.length).toBe(25)
      expect(third.result.length).toBe(10)

      const all = [...first.result, ...second.result, ...third.result].map((r: any) => r.n)
      expect(all).toEqual(Array.from({ length: 60 }, (_, i) => i))
    })
  })

  describe('PartiQL', () => {
    it('executes SELECT', async () => {
      const results = await connection.executeQuery(`SELECT * FROM "Users" WHERE "id" = 'u2'`)
      expect(results).toHaveLength(1)
      expect(results[0].rows.length).toBe(1)
      expect(results[0].rows[0].name).toBe('Bob')
    })

    it('executes INSERT and reads it back', async () => {
      await connection.executeQuery(
        `INSERT INTO "Users" VALUE {'id': 'partiql', 'email': 'pq@example.com', 'name': 'PartiQL'}`
      )
      const results = await connection.executeQuery(
        `SELECT * FROM "Users" WHERE "id" = 'partiql'`
      )
      expect(results[0].rows.length).toBe(1)
      expect(results[0].rows[0].email).toBe('pq@example.com')
    })

    it('executes UPDATE via PartiQL', async () => {
      await connection.executeApplyChanges({
        inserts: [{ table: 'Users', data: [{ id: 'partiql-upd', email: 'upd@example.com', name: 'UpdMe', age: 1 }] }],
        updates: [],
        deletes: [],
      })
      try {
        await connection.executeQuery(`UPDATE "Users" SET "age" = 42 WHERE "id" = 'partiql-upd'`)
        const result = await connection.selectTop('Users', 0, 100, [], [{ field: 'id', type: '=', value: 'partiql-upd' }])
        expect(result.result[0].age).toBe(42)
      } finally {
        await connection.executeApplyChanges({
          inserts: [], updates: [],
          deletes: [{ table: 'Users', primaryKeys: [{ column: 'id', value: 'partiql-upd' }] }],
        })
      }
    })

    it('runs multiple statements in one call', async () => {
      await connection.executeApplyChanges({
        inserts: [{ table: 'Users', data: [{ id: 'ms1', email: 'ms1@example.com', name: 'MS1' }] }],
        updates: [],
        deletes: [],
      })
      try {
        const results = await connection.executeQuery(
          `SELECT * FROM "Users" WHERE "id" = 'ms1'; SELECT * FROM "Users" WHERE "id" = 'missing'`
        )
        expect(results).toHaveLength(2)
        expect(results[0].rows.length).toBe(1)
        expect(results[1].rows.length).toBe(0)
      } finally {
        await connection.executeApplyChanges({
          inserts: [], updates: [],
          deletes: [{ table: 'Users', primaryKeys: [{ column: 'id', value: 'ms1' }] }],
        })
      }
    })

    it('surfaces syntax errors as thrown errors', async () => {
      await expect(connection.executeQuery(`NOT A VALID PARTIQL STATEMENT`)).rejects.toThrow()
    })

    it('surfaces unknown-table errors', async () => {
      await expect(connection.executeQuery(`SELECT * FROM "DoesNotExist"`)).rejects.toThrow()
    })
  })

  describe('streaming cursor', () => {
    it('streams all rows in chunks', async () => {
      const stream = await connection.selectTopStream('Events', [], [], 4)
      await stream.cursor.start()
      const all: any[] = []
      for (;;) {
        const chunk = await stream.cursor.read()
        if (chunk.length === 0) break
        all.push(...chunk)
      }
      expect(all.length).toBe(10)
    })

    it('streams with a filter applied', async () => {
      const stream = await connection.selectTopStream(
        'Events',
        [],
        [{ field: 'kind', type: '=', value: 'click' }],
        4
      )
      await stream.cursor.start()
      const all: any[] = []
      for (;;) {
        const chunk = await stream.cursor.read()
        if (chunk.length === 0) break
        all.push(...chunk)
      }
      // Half of the seed rows are 'click'.
      expect(all.length).toBeGreaterThan(0)
      // Each row is a positional array matching `columns`. The kind column should
      // be somewhere in each row and every value should equal 'click'.
      const kindIdx = stream.columns.findIndex((c: any) => c.columnName === 'kind')
      expect(kindIdx).toBeGreaterThanOrEqual(0)
      for (const row of all) {
        expect(row[kindIdx]).toBe('click')
      }
    })

    it('stops emitting rows after cancel()', async () => {
      const stream = await connection.selectTopStream('Events', [], [], 2)
      await stream.cursor.start()
      const first = await stream.cursor.read()
      expect(first.length).toBeGreaterThan(0)

      await stream.cursor.cancel()
      const after = await stream.cursor.read()
      expect(after.length).toBe(0)
    })

    it('streams PartiQL results via queryStream', async () => {
      const stream = await connection.queryStream(`SELECT * FROM "Users"`, 2)
      await stream.cursor.start()
      const all: any[] = []
      for (;;) {
        const chunk = await stream.cursor.read()
        if (chunk.length === 0) break
        all.push(...chunk)
      }
      expect(all.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('index management', () => {
    it('creates and drops a GSI via alterIndex', async () => {
      const tableName = `IndexTest_${Date.now()}`
      await connection.createTable({ table: tableName })

      // DynamoDB creates GSIs asynchronously. Poll via the raw SDK until the
      // index reports ACTIVE (or is gone) before continuing.
      const raw = (connection as any).raw
      const { DescribeTableCommand } = await import('@aws-sdk/client-dynamodb')
      const indexStatus = async (indexName: string) => {
        const desc: any = await raw.send(new DescribeTableCommand({ TableName: tableName }))
        return desc.Table?.GlobalSecondaryIndexes?.find((i: any) => i.IndexName === indexName)?.IndexStatus
      }
      const waitFor = async (pred: () => Promise<boolean>, msg: string) => {
        const deadline = Date.now() + 30_000
        while (Date.now() < deadline) {
          if (await pred()) return
          await new Promise((r) => setTimeout(r, 250))
        }
        throw new Error(`Timed out waiting for ${msg}`)
      }

      try {
        await connection.alterIndex({
          table: tableName,
          additions: [{
            name: 'byLabel',
            columns: [{ name: 'label', order: 'ASC' }],
            unique: false,
          }],
          drops: [],
        })

        await waitFor(async () => (await indexStatus('byLabel')) === 'ACTIVE', 'GSI byLabel to become ACTIVE')

        const indexes = await connection.listTableIndexes(tableName)
        expect(indexes.some((i: any) => i.name === 'byLabel')).toBe(true)

        await connection.alterIndex({
          table: tableName,
          additions: [],
          drops: [{ name: 'byLabel' }],
        })

        await waitFor(async () => (await indexStatus('byLabel')) === undefined, 'GSI byLabel to be removed')
        const indexesAfter = await connection.listTableIndexes(tableName)
        expect(indexesAfter.find((i: any) => i.name === 'byLabel')).toBeUndefined()
      } finally {
        await connection.dropElement(tableName, DatabaseElement.TABLE).catch(() => {})
      }
    })
  })

  describe('read-only mode', () => {
    let roConnection: BasicDatabaseClient<any>

    beforeAll(async () => {
      const config: any = {
        client: 'dynamodb',
        readOnlyMode: true,
        iamAuthOptions: {
          authType: IamAuthType.Key,
          accessKeyId: 'local',
          secretAccessKey: 'local',
          awsRegion: 'us-east-1',
          iamAuthenticationEnabled: true,
        },
        dynamoDbOptions: { endpoint },
      }
      const server = createServer(config)
      roConnection = server.createConnection('ro')
      await roConnection.connect()
    })

    afterAll(async () => {
      if (roConnection) await roConnection.disconnect()
    })

    it('blocks inserts via executeApplyChanges', async () => {
      await expect(roConnection.executeApplyChanges({
        inserts: [{ table: 'Users', data: [{ id: 'nope', email: 'nope@example.com', name: 'Nope' }] }],
        updates: [],
        deletes: [],
      })).rejects.toThrow(/Read-Only/i)
    })

    it('blocks PartiQL mutations', async () => {
      await expect(roConnection.executeQuery(
        `INSERT INTO "Users" VALUE {'id': 'nope2', 'email': 'nope2@example.com', 'name': 'Nope2'}`
      )).rejects.toThrow(/Read-Only/i)
    })

    it('blocks createTable and dropElement', async () => {
      await expect(roConnection.createTable({ table: `ShouldNotExist_${Date.now()}` })).rejects.toThrow(/Read-Only/i)
      await expect(roConnection.dropElement('Users', DatabaseElement.TABLE)).rejects.toThrow(/Read-Only/i)
    })

    it('still allows reads', async () => {
      const tables = await roConnection.listTables()
      expect(tables.length).toBeGreaterThan(0)

      const users = await roConnection.selectTop('Users', 0, 10, [], [])
      expect(users.result.length).toBeGreaterThan(0)

      const results = await roConnection.executeQuery(`SELECT * FROM "Users" WHERE "id" = 'u2'`)
      expect(results[0].rows.length).toBe(1)
    })
  })

  describe('table lifecycle', () => {
    it('creates and drops tables', async () => {
      const table = `TmpTable_${Date.now()}`
      await connection.createTable({ table })
      const tables = await connection.listTables()
      expect(tables.map((t) => t.name)).toContain(table)

      await connection.dropElement(table, DatabaseElement.TABLE)
      const after = await connection.listTables()
      expect(after.map((t) => t.name)).not.toContain(table)
    })

    it('rejects dropping non-table elements', async () => {
      await expect(
        connection.dropElement('Users', DatabaseElement.VIEW)
      ).rejects.toThrow()
    })
  })
})
