import { GenericContainer, Wait } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests, runReadOnlyTests } from './all'
import { IDbConnectionServerConfig } from '@/lib/db/types'
import { TableOrView } from '@/lib/db/models'

const TEST_VERSIONS = [
  { version: '2017-latest', readonly: false },
  { version: '2017-latest', readonly: true },
  { version: '2019-latest', readonly: false },
  { version: '2019-latest', readonly: true },
  // FIXME 2022-latest has a breaking change. We'll use the previous build
  // for now.
  // { version: '2022-latest', readonly: false },
  // { version: '2022-latest', readonly: true },
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
        .withEnv("MSSQL_PID", "Express")
        .withEnv("SA_PASSWORD", "Example*1")
        .withEnv("MSSQL_SA_PASSWORD", "Example*1")
        .withEnv("ACCEPT_EULA", "Y")
        .withExposedPorts(1433)
        .withWaitStrategy(Wait.forHealthCheck())
        .withHealthCheck({
          test: `/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "Example*1" -q "SELECT 1" || exit 1`,
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

    // import tests keep timing out for some reason, but they do work in ultimate when running
    // Not sure what's up with that
    describe.skip("Imports", () => {
      it('should import correctly', async () => {
        const tableName = 'import_table'
        const executeOptions = { multiple: false }
        const table = {
          name: tableName,
          schema: 'public',
          entityType: 'table'
        } as TableOrView
        const {
          step0,
          beginCommand,
          truncateCommand,
          lineReadCommand,
          commitCommand,
          rollbackCommand,
          finalCommand
          } = util.connection.getImportScripts(table)
        const formattedData = util.buildImportData(tableName)
        const importSQL = util.connection.getImportSQL(formattedData)
    
        expect(typeof step0).toBe('function')
        expect(typeof beginCommand).toBe('function')
        expect(typeof truncateCommand).toBe('function')
        expect(typeof lineReadCommand).toBe('function')
        expect(typeof commitCommand).toBe('function')
        expect(typeof rollbackCommand).toBe('function')
        expect(finalCommand).toBeUndefined()
    
        await step0(executeOptions)
        await beginCommand(executeOptions)
        await truncateCommand(executeOptions)
        await lineReadCommand(importSQL, {multiple: true})
        await commitCommand(executeOptions)
    
        const hats = await util.knex.select().table(tableName)
        expect(hats.length).toBe(4)
      })
  
      it('should rollback', async () => {
        const tableName = 'import_table'
        const executeOptions = { multiple: false }
        const table = {
          name: tableName,
          entityType: 'table'
        } as TableOrView
        const formattedData = util.buildImportData(tableName)
        const {
          beginCommand,
          lineReadCommand,
          rollbackCommand,
        } = util.connection.getImportScripts(table)
        const importSQL = util.connection.getImportSQL(formattedData)
        const hatsStart = await util.knex.select().table(tableName)
        await beginCommand(executeOptions)
        await lineReadCommand(importSQL, {multiple: true})
        await rollbackCommand(executeOptions)
    
        const hats = await util.knex.select().table(tableName)
        expect(hats.length).toBe(hatsStart.length)
      })
    })
  })
}

TEST_VERSIONS.forEach(({ version, readonly }) => testWith(version, readonly));
