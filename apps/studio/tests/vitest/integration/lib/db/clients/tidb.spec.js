import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '@tests/lib/db'
import { runCommonTests } from '@tests/integration/lib/db/clients/all'
import { SqlGenerator } from '@shared/lib/sql/SqlGenerator'
import { BasicTable } from '@/lib/data/table_templates'

describe("TiDB Tests", () => {
  vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout })

  let container;
  let util

  beforeAll(async () => {
    const timeoutDefault = 5000
    container = await new GenericContainer("pingcap/tidb")
      .withName("tidb")
      .withExposedPorts(4000)
      .withStartupTimeout(dbtimeout)
      .start()
    vi.setConfig({ testTimeout: timeoutDefault })
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

  describe("Param tests", () => {
    it("Should be able to handle positional (?) params", async () => {
      await util.paramTest(['?']);
    })
  })

  // Regression test: https://github.com/pingcap/docs/pull/23743#issuecomment-6284604054
  // TiDB can't add AUTO_INCREMENT to an existing column, so the table builder's
  // SQL has to create the column with it.
  it("Should create the table builder's default table", async () => {
    const generator = new SqlGenerator('mysql', {
      dbConfig: util.connection.server.config,
      dbName: util.connection.database.database,
    })
    const schema = { ...BasicTable.toSchema('mysql'), name: 'table_builder_default' }
    const query = await util.connection.query(generator.buildSql(schema))
    await query.execute()

    await util.knex.raw('insert into table_builder_default () values (), ()')
    const rows = await util.knex('table_builder_default').select('id').orderBy('id')
    expect(rows).toHaveLength(2)
    expect(rows[1].id).toBeGreaterThan(rows[0].id)
  })
})
