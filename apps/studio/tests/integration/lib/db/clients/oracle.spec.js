import path from 'path';
import { DockerComposeEnvironment, GenericContainer, Wait } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all'

describe("Oracle Tests", () => {

  let container;
  let util
  // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

  const getUtil = () => util

  beforeAll(async () => {
    // this is the testcontainers default startup wait time.
    console.log("ENV/ORACLE CLI: ", process.env['ORACLE_CLI_PATH'])
    console.log("ENV/LD_LIBRARY_PATH: ", process.env['LD_LIBRARY_PATH'])
    const timeoutDefault = 120000
    jest.setTimeout(timeoutDefault)
    const localDir = path.resolve('./tests/docker/oracle_init')
    console.log("INIT DIR: ", localDir)
    container = await new GenericContainer('gvenzl/oracle-xe:18')
      .withName('oracle')
      .withEnv("ORACLE_PASSWORD", 'password')
      .withEnv('ORACLE_DATABASE', 'beekeeper')
      .withEnv('APP_USER', 'beekeeper')
      .withEnv('APP_USER_PASSWORD', 'password')
      .withExposedPorts(1521)
      .withBindMount(localDir, '/docker-entrypoint-initdb.d', 'ro')
      .withHealthCheck({
        test: "sqlplus -s beekeeper/password@//localhost/BEEKEEPER <<< \"select * from actor;\" | grep 'no rows'",
        interval: 10000,
        timeout: 10000,
        retries: 12, // 2 minutes
        startPeriod: 60000
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .start()

    const config = {
      client: 'oracle',
      host: container.getHost(),
      port: container.getMappedPort(1521),
      instantClientLocation: process.env['ORACLE_CLI_PATH'],
      user: 'beekeeper',
      password: 'password',
      serviceName: 'BEEKEEPER',
      options: {
        connectionMethod: 'manual'
      }
    }
    console.log("connecting with config", config)
    util = new DBTestUtil(config, "BEEKEEPER", { defaultSchema: 'BEEKEEPER', dialect: 'oracle' })
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

  describe("When running block queries", () => {
    it.only("Should execute block queries without error", async () => {
      await util.connection.executeQuery(`
        DECLARE RESULT VARCHAR(256);
        BEGIN SELECT "street" INTO RESULT FROM "addresses";
        END;
      `)
    })
  })


  describe("Common DB Tests", () => {
    runCommonTests(getUtil, false)
  })
})
