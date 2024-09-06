import { GenericContainer, Wait } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests, runReadOnlyTests } from './all'
import { IDbConnectionServerConfig } from '@/lib/db/types'

const TEST_VERSIONS = [
  { version: '2017-latest', readonly: false },
  { version: '2017-latest', readonly: true },
  // FIXME 2022-latest has a breaking change. We'll use the previous build
  // for now.
  // { version: '2019-latest', readonly: false },
  // { version: '2019-latest', readonly: true },
  // { version: '2022-latest', readonly: false },
  // { version: '2022-latest', readonly: true },
  { version: '2019-CU27-ubuntu-20.04', readonly: false },
  { version: '2019-CU27-ubuntu-20.04', readonly: true },
  { version: '2022-CU13-ubuntu-22.04', readonly: false },
  { version: '2022-CU13-ubuntu-22.04', readonly: true },
]

function testWith(dockerTag: string, readonly: boolean) {
  describe(`SQL Server [${dockerTag}] - read-only mode? ${readonly}`, () => {
    jest.setTimeout(dbtimeout)

    let container;
    let util
    // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

    const getUtil = () => util

    beforeAll(async () => {
      const timeoutDefault = 5000

      container = await new GenericContainer(`mcr.microsoft.com/mssql/server:${dockerTag}`)
        .withName(`mssql-${dockerTag}`)
        .withEnvironment({
          "MSSQL_PID": "Express",
          "SA_PASSWORD": "Example*1",
          "MSSQL_SA_PASSWORD": "Example*1",
          "ACCEPT_EULA": "Y"
        })
        .withExposedPorts(1433)
        .withWaitStrategy(Wait.forHealthCheck())
        .withHealthCheck({
          test: ["CMD-SHELL", `/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "Example*1" -q "SELECT 1" || exit 1`],
          interval: 2000,
          timeout: 3000,
          retries: 10,
          startPeriod: 5000,
        })
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
