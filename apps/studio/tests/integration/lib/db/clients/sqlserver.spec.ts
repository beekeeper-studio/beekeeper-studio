import { GenericContainer, Wait } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests, runReadOnlyTests } from './all'
import { IDbConnectionServerConfig } from '@/lib/db/types'

// SQL Server testing policy:
// We test against SQL Server until it leaves mainstream support
//

const TEST_VERSIONS = [
  // In July 2024 Microsoft released images that moved the bin location of sqlcmd:
  // https://github.com/elastic/apm-agent-nodejs/issues/4147
  // Microsoft's response to this:
  // https://github.com/microsoft/mssql-docker/issues/892#issuecomment-2249029917
  // FIXME 2022-latest has a breaking change. We'll use the previous build
  // 2017 crashes. I don't know why
  // { version: '2017-CU31-GDR2-ubuntu-18.04', readonly: false },
  // { version: '2017-CU30-ubuntu-18.04', readonly: true },

  // FYI - this might break when mssql-tools upgrades to version 19, as it affects the path
  // of sqlcmd
  { version: '2019-latest', readonly: false },
  { version: '2019-latest', readonly: true },
  { version: '2022-latest', readonly: false },
  { version: '2022-latest', readonly: true },

]

function testWith(dockerTag: string, readonly: boolean) {
  describe(`SQL Server [${dockerTag}] - read-only mode? ${readonly}`, () => {
    jest.setTimeout(dbtimeout)

    const sqlCmdPath = dockerTag.includes('CU') ? '/opt/mssql-tools' : '/opt/mssql-tools18'

    let container;
    let util
    // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

    const getUtil = () => util

    beforeAll(async () => {
      const timeoutDefault = 5000

      container = await new GenericContainer(`mcr.microsoft.com/mssql/server:${dockerTag}`)
        // .withResourcesQuota({ memory: 2, cpu: 1 })
        .withEnvironment({
          "MSSQL_PID": "Express",
          "SA_PASSWORD": "Example*1",
          "MSSQL_SA_PASSWORD": "Example*1",
          "ACCEPT_EULA": "Y"
        })
        .withExposedPorts(1433)
        .withWaitStrategy(Wait.forLogMessage("SQL Server is now ready for client connections."))
        .withStartupTimeout(dbtimeout)
        .start()

      jest.setTimeout(timeoutDefault)
      const config = {
        client: 'sqlserver',
        host: container.getHost(),
        port: container.getMappedPort(1433),
        user: 'sa',
        password: 'Example*1',
        trustServerCertificate: true,
        readOnlyMode: readonly
      } as IDbConnectionServerConfig
      util = new DBTestUtil(config, "tempdb", { defaultSchema: 'dbo', dialect: 'sqlserver'})
      await util.setupdb()

      await util.knex.schema.raw("CREATE SCHEMA hello")
      await util.knex.schema.raw("CREATE TABLE hello.world(id int, name varchar(255))")
      await util.knex.schema.raw("INSERT INTO hello.world(id, name) VALUES(1, 'spiderman')")
      await util.knex.schema.raw("CREATE TABLE withbits(id int, bitcol bit NOT NULL)");
      await util.knex.schema.raw("CREATE TABLE [my[socks]]](id int, name varchar(20))");
      await util.knex.schema.raw("INSERT INTO [my[socks]]](id, name) VALUES (1, 'blue')");
    })

    afterAll(async () => {
      await util.disconnect()
      if (container) {
        await container.stop()
      }
    })

    describe("Common DB Tests", () => {
      if (readonly) {
        runReadOnlyTests(getUtil)
      } else {
        runCommonTests(getUtil, { dbReadOnlyMode: readonly })
      }
    })

    it("Can select top from table with square brackets in name", async () => {
      const top = await util.connection.selectTop("my[socks]", 0, 1, [{dir: 'ASC', field: 'id'}], [])
      expect(top.result.length).toBe(1)
    })

    describe("Multi schema", () => {
      it("should fetch table properties for a non-dbo schema", async () => {
        await util.connection.getTableProperties('world', 'hello')
      })

      it("should fetch data for a non-dbo schema", async () => {
        const result = await util.connection.selectTop('world', 0, 100, [], [], 'hello')
        expect(result.result.length).toBe(1)
        expect(result.fields.length).toBe(2)
      })
    })

    // Regression test for #1945 -> cloning with bit fields doesn't work
    it("Should be able to insert with bit fields", async () => {
      if (readonly) return;

      const changes = {
        inserts: [
          {
            table: 'withbits',
            data: [
              {
                id: 1,
                bitcol: 0
              },
              {
                id: 2,
                bitcol: true
              }
            ]
          }
        ]
      };

      await util.connection.applyChanges(changes);

      const results = await util.knex.select().table('withbits');
      expect(results.length).toBe(2);

      const firstResult = { ...results[0] };
      const secondResult = { ...results[1] };

      expect(firstResult).toStrictEqual({
        id: 1,
        bitcol: false
      });

      expect(secondResult).toStrictEqual({
        id: 2,
        bitcol: true
      })
    })
  })
}

TEST_VERSIONS.forEach(({ version, readonly }) => testWith(version, readonly));
