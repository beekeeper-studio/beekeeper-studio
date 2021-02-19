import { GenericContainer, Wait } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"
import { itShouldInsertGoodData, itShouldNotInsertBadData, itShouldApplyAllTypesOfChanges, itShouldNotCommitOnChangeError } from './all'

describe("SQL Server Tests", () => {

  let container;
  let util
  // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

  beforeAll(async () => {
    const timeoutDefault = 5000
    jest.setTimeout(dbtimeout)

    container = await new GenericContainer("mcr.microsoft.com/mssql/server", "2017-latest-ubuntu")
      .withName("mssql")
      .withEnv("MSSQL_PID", "Express")
      .withEnv("SA_PASSWORD", "Example*1")
      .withEnv("MSSQL_SA_PASSWORD", "Example*1")
      .withEnv("ACCEPT_EULA", "Y")
      .withExposedPorts(1433)
      .withWaitStrategy(Wait.forHealthCheck())
      .withHealthCheck({
        test: `/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "Example*1" -q "SELECT 1" || exit 1`,
        interval: new Duration(2, TemporalUnit.SECONDS),
        timeout: new Duration(3, TemporalUnit.SECONDS),
        retries: 10,
        startPeriod: new Duration(5, TemporalUnit.SECONDS)
      })
      .withStartupTimeout(new Duration(dbtimeout, TemporalUnit.MILLISECONDS))
      .start()

    jest.setTimeout(timeoutDefault)
    const config = {
      client: 'sqlserver',
      host: container.getContainerIpAddress(),
      port: container.getMappedPort(1433),
      user: 'sa',
      password: 'Example*1'
    }
    util = new DBTestUtil(config, "tempdb", { defaultSchema: 'dbo'})
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

  it("Should insert good data", async () => {
    await itShouldInsertGoodData(util)
  })

  it("Should not insert bad data", async() => {
    await itShouldNotInsertBadData(util)
  })

  it("Should apply all types of changes", async() => {
    await itShouldApplyAllTypesOfChanges(util)
  })

  it("Should not commit on change error", async() => {
    await itShouldNotCommitOnChangeError(util)
  })
})