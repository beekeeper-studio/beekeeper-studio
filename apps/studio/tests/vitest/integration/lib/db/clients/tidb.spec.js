import { describe, it, vi, beforeAll, afterAll, expect } from "vitest"
import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '@tests/lib/db'
import { runCommonTests } from './all'
import { SqlGenerator } from '@shared/lib/sql/SqlGenerator'

describe("TiDB Tests", () => {
  vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout })

  let container;
  let util

  beforeAll(async () => {
    container = await new GenericContainer("pingcap/tidb")
      .withName("tidb")
      .withExposedPorts(4000)
      .withStartupTimeout(dbtimeout)
      .start()
    const config = {
      client: 'tidb',
      host: container.getHost(),
      port: container.getMappedPort(4000),
      user: 'root',
      password: ''
    }
    util = new DBTestUtil(config, "test", { dialect: 'mysql'})
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

  describe("Table builder", () => {
    // TiDB rejects `alter table ... modify column ... auto_increment`
    // ("Unsupported modify column: can't set auto_increment"), so the
    // generated SQL has to declare auto_increment in the create table itself.
    it("Should create a table with an autoincrement primary key", async () => {
      const generator = new SqlGenerator(util.dialect, {
        dbConfig: util.connection.server.config,
        dbName: util.connection.database.database,
      })
      const sql = generator.buildSql({
        name: 'builder_autoincrement',
        columns: [
          { columnName: 'id', dataType: 'autoincrement', primaryKey: true, nullable: false },
          { columnName: 'name', dataType: 'varchar(255)', nullable: true },
        ],
      })

      // Same path as the "Create Table" button in the table builder
      const query = await util.connection.query(sql)
      await query.execute()

      const columns = await util.connection.listTableColumns('builder_autoincrement')
      const id = columns.find((c) => c.columnName === 'id')
      expect(id.extra).toMatch(/auto_increment/i)

      await util.knex('builder_autoincrement').insert([{ name: 'a' }, { name: 'b' }])
      const rows = await util.knex('builder_autoincrement').select().orderBy('id')
      expect(rows.map((r) => r.name)).toEqual(['a', 'b'])
      expect(rows[0].id).toBeLessThan(rows[1].id)
    })
  })

  describe("Param tests", () => {
    it("Should be able to handle positional (?) params", async () => {
      await util.paramTest(['?']);
    })
  })
})
