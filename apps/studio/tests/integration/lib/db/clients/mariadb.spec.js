import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all'

describe("MariaDB Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
  let util

  beforeAll(async () => {
    const timeoutDefault = 5000
    container = await new GenericContainer("mariadb")
      .withName("maria")
      .withEnv("MYSQL_ROOT_PASSWORD", "test")
      .withEnv("MYSQL_DATABASE", "test")
      .withExposedPorts(3306)
      .withStartupTimeout(dbtimeout)
      .start()
    jest.setTimeout(timeoutDefault)
    const config = {
      client: 'mariadb',
      host: container.getHost(),
      port: container.getMappedPort(3306),
      user: 'root',
      password: 'test'
    }
    util = new DBTestUtil(config, "test", { dialect: 'mysql'})
    await util.setupdb()
  })

  afterAll(async () => {
    if (util.connection) {
      await util.connection.disconnect()
    }
    if (container) {
      await container.stop()
    }
  })

  describe("Common Tests", () => {
    runCommonTests(() => util)
  })
})
