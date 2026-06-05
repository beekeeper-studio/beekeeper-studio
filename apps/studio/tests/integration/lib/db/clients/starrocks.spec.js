import { GenericContainer } from 'testcontainers'
import mysql from 'mysql2/promise'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all'

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
})
