import { GenericContainer } from 'testcontainers'
import mysql from 'mysql2/promise'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all'
import { StarRocksData } from '@shared/lib/dialects/starrocks'

// StarRocks' all-in-one image bundles FE + BE. The BE registers a few seconds
// after the FE accepts connections, and DDL fails until a backend is alive.
async function waitForBackend(host, port) {
  const deadline = Date.now() + dbtimeout
  while (Date.now() < deadline) {
    let conn
    try {
      conn = await mysql.createConnection({ host, port, user: 'root', password: '' })
      const [rows] = await conn.query('SHOW BACKENDS')
      if (rows.some((r) => String(r.Alive) === 'true')) {
        await conn.query('CREATE DATABASE IF NOT EXISTS test')
        return
      }
    } catch {
      // FE not ready yet, retry
    } finally {
      if (conn) {
        await conn.end()
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error('StarRocks backend did not become alive in time')
}

describe("StarRocks Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
  let util

  beforeAll(async () => {
    const timeoutDefault = 5000
    container = await new GenericContainer("starrocks/allin1-ubuntu")
      .withName("starrocks")
      .withExposedPorts(9030, 8030, 8040)
      .withStartupTimeout(dbtimeout)
      .start()

    const host = container.getHost()
    const port = container.getMappedPort(9030)
    await waitForBackend(host, port)

    jest.setTimeout(timeoutDefault)
    const config = {
      client: 'starrocks',
      host,
      port,
      user: 'root',
      password: ''
    }
    util = new DBTestUtil(config, "test", {
      dialect: 'mysql',
      dialectData: StarRocksData,
      skipGeneratedColumns: true,
      skipTransactions: true,
      // `one integer primary key` (inline PK) is invalid in StarRocks.
      queryTestsTableCreationQuery: 'create table one_record (one int not null) primary key(one)',
    })
    await util.setupdb()
  })

  afterAll(async () => {
    await util.disconnect()
    if (container) {
      await container.stop()
    }
  })

  describe("Common Tests", () => {
    runCommonTests(() => util)
  })

  describe("Param tests", () => {
    it("Should be able to handle positional (?) params", async () => {
      await util.paramTest(['?']);
    })
  })

  // StarRocks' SQL transactions are too limited to wrap applyChanges in one transaction
  // Ref: https://docs.starrocks.io/docs/loading/SQL_transaction/#usage-notes
  describe("executeApplyChanges", () => {
    const schema = 'test'

    beforeEach(async () => {
      await util.knex.raw('drop table if exists sr_apply')
      await util.knex.raw(
        'create table sr_apply (id int not null, name varchar(50)) primary key(id)'
      )
    })

    afterAll(async () => {
      await util.knex.raw('drop table if exists sr_apply')
    })

    it("inserts multiple rows into the same table", async () => {
      await util.connection.applyChanges({
        inserts: [
          { table: 'sr_apply', schema, data: [{ id: 1, name: 'a' }] },
          { table: 'sr_apply', schema, data: [{ id: 2, name: 'b' }] },
        ],
      })

      const rows = await util.knex('sr_apply').select().orderBy('id')
      expect(rows).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ])
    })

    it("applies inserts, updates and deletes together", async () => {
      await util.connection.applyChanges({
        inserts: [
          { table: 'sr_apply', schema, data: [{ id: 1, name: 'a' }] },
          { table: 'sr_apply', schema, data: [{ id: 2, name: 'b' }] },
        ],
      });
      await util.connection.applyChanges({
        inserts: [{ table: 'sr_apply', schema, data: [{ id: 3, name: 'c' }] }],
        updates: [{
          table: 'sr_apply',
          schema,
          primaryKeys: [{ column: 'id', value: 1 }],
          column: 'name',
          value: 'updated',
        }],
        deletes: [{
          table: 'sr_apply',
          schema,
          primaryKeys: [{ column: 'id', value: 2 }],
        }],
      })

      const rows = await util.knex('sr_apply').select().orderBy('id')
      expect(rows).toEqual([
        { id: 1, name: 'updated' },
        { id: 3, name: 'c' },
      ])
    })

    it("returns the updated rows", async () => {
      await util.connection.applyChanges({
        inserts: [
          { table: 'sr_apply', schema, data: [{ id: 1, name: 'a' }] },
        ],
      });
      const results = await util.connection.applyChanges({
        updates: [{
          table: 'sr_apply',
          schema,
          primaryKeys: [{ column: 'id', value: 1 }],
          column: 'name',
          value: 'updated',
        }],
      })

      expect(results).toEqual([{ id: 1, name: 'updated' }])
    })

    it("returns an empty result when there are no updates", async () => {
      const results = await util.connection.applyChanges({
        inserts: [{ table: 'sr_apply', schema, data: [{ id: 1, name: 'a' }] }],
      })

      expect(results).toEqual([])
    })
  })
})
