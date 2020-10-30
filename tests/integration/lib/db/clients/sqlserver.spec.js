import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"

describe("SQL Server Tests", () => {

  let container;
  let util

  beforeAll(async () => {
    const timeoutDefault = 5000
    jest.setTimeout(dbtimeout)

    const cmd = `
    /opt/mssql-tools/bin/sqlcmd -S localhost \
    -q "CREATE DATABASE test" -U sa -P "$SA_PASSWORD" \
    && /opt/mssql/bin/sqlservr
    `

    container = await new GenericContainer("mcr.microsoft.com/mssql/server:2017-latest-ubuntu")
      .withName("mssql")
      .withEnv("MSSQL_PID", "Express")
      .withEnv("SA_PASSWORD", "Example@1")
      .withEnv("ACCEPT_EULA", "Y")
      .withExposedPorts(1433)
      .withCmd(cmd)
      .withStartupTimeout(new Duration(dbtimeout, TemporalUnit.MILLISECONDS))
      .start()
    jest.setTimeout(timeoutDefault)
    const config = {
      client: 'sqlserver',
      host: container.getContainerIpAddress(),
      port: container.getMappedPort(1433),
      user: 'sa',
      password: 'Example@1'
    }
    util = new DBTestUtil(config, "test")
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

  it("Should pass standard tests", async () => {
    await util.testdb()
  })
})