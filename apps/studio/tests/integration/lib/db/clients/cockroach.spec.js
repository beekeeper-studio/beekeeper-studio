import { DockerComposeEnvironment } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all';

describe("CockroachDB Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
  let util
  let environment
  // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

  beforeAll(async () => {
    const timeoutDefault = 5000
    environment = await new DockerComposeEnvironment("tests/docker", "cockroachdb.yml").up()
    container = environment.getContainer('test_cockroachdb')
    jest.setTimeout(timeoutDefault)
    const config = {
      client: 'cockroachdb',
      host: container.getHost(),
      port: container.getMappedPort(26257),
      user: 'root',
    }
    util = new DBTestUtil(config, "defaultdb", {dialect: 'postgresql', version: '7.2', skipPkQuote: true, defaultSchema: 'public'})
    await util.setupdb()

  })

  afterAll(async () => {
    await util.disconnect()
    if (container) {
      await container.stop()
    }
    if (environment) {
      await environment.stop()
    }
  })

  describe("Common Tests", () => {
    runCommonTests(() => util)
  })

})
