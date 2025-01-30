import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all'

describe("TiDB Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
  let util

  beforeAll(async () => {
    const timeoutDefault = 5000
    container = await new GenericContainer("pingcap/tidb")
      .withName("tidb")
      .withExposedPorts(4000)
      .withStartupTimeout(dbtimeout)
      .start()
    jest.setTimeout(timeoutDefault)
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
})
