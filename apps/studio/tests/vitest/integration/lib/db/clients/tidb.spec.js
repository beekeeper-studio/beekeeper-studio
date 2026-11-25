import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"
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

  describe("SQLGenerator", () => {
    // Regression: knex's mysql dialect added auto_increment with a separate
    // `alter table ... modify column`, which TiDB rejects with
    // "Unsupported modify column: can't set auto_increment"
    const tableName = 'generator_autoincrement_test'

    afterEach(async () => {
      await util.knex.schema.dropTableIfExists(tableName)
    })

    async function createAndInsert(columns) {
      const generator = new SqlGenerator('mysql', {
        dbConfig: util.connection.server.config,
        dbName: util.connection.database.database,
      })
      const sql = generator.buildSql({ name: tableName, columns })
      await util.connection.executeQuery(sql)

      await util.knex(tableName).insert({ name: 'first' })
      await util.knex(tableName).insert({ name: 'second' })
      return await util.knex(tableName).select('id', 'name').orderBy('id')
    }

    it("creates an auto increment primary key that TiDB accepts", async () => {
      const rows = await createAndInsert([
        { columnName: 'id', dataType: 'autoincrement', primaryKey: true, nullable: false },
        { columnName: 'name', dataType: 'varchar(255)', nullable: true },
      ])

      expect(rows.map((r) => r.name)).toEqual(['first', 'second'])
      expect(rows[0].id).toBeGreaterThan(0)
      expect(rows[1].id).toBeGreaterThan(rows[0].id)

      const primaryKeys = await util.connection.getPrimaryKeys(tableName)
      expect(primaryKeys.map((k) => k.columnName)).toEqual(['id'])
    })

    it("creates an auto increment column in a composite primary key", async () => {
      const rows = await createAndInsert([
        { columnName: 'id', dataType: 'autoincrement', primaryKey: true, nullable: false },
        { columnName: 'name', dataType: 'varchar(255)', primaryKey: true, nullable: false },
      ])

      expect(rows[1].id).toBeGreaterThan(rows[0].id)

      const primaryKeys = await util.connection.getPrimaryKeys(tableName)
      expect(primaryKeys.map((k) => k.columnName).sort()).toEqual(['id', 'name'])
    })
  })

  describe("Param tests", () => {
    it("Should be able to handle positional (?) params", async () => {
      await util.paramTest(['?']);
    })
  })
})
