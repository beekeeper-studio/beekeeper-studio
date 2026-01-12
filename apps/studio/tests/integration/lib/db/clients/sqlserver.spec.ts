import { GenericContainer, Wait } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests, runReadOnlyTests } from './all'
import { IDbConnectionServerConfig } from '@/lib/db/types'
import fs from 'fs';
import path from 'path';

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

      // Create a test database (tempdb doesn't support READ_COMMITTED_SNAPSHOT)
      const testDbName = 'beekeeper_test_db'

      // Connect to master to create the test database
      const masterUtil = new DBTestUtil(config, "master", { defaultSchema: 'dbo', dialect: 'sqlserver'})
      await masterUtil.connection.connect()

      try {
        await masterUtil.knex.schema.raw(`DROP DATABASE ${testDbName}`)
      } catch (e) {
        // Database might not exist, ignore
      }

      await masterUtil.knex.schema.raw(`CREATE DATABASE ${testDbName}`)

      // Enable READ_COMMITTED_SNAPSHOT isolation to prevent readers from being blocked by writers
      // This allows transaction isolation tests to work properly
      await masterUtil.knex.schema.raw(`ALTER DATABASE ${testDbName} SET READ_COMMITTED_SNAPSHOT ON`)

      await masterUtil.disconnect()

      // Now connect to the test database
      util = new DBTestUtil(config, testDbName, { defaultSchema: 'dbo', dialect: 'sqlserver'})
      await util.setupdb()

      await util.knex.schema.raw("CREATE SCHEMA hello")
      await util.knex.schema.raw("CREATE TABLE hello.world(id int, name varchar(255))")
      await util.knex.schema.raw("INSERT INTO hello.world(id, name) VALUES(1, 'spiderman')")
      await util.knex.schema.raw("CREATE TABLE withbits(id int, bitcol bit NOT NULL)");
      await util.knex.schema.raw("CREATE TABLE [my[socks]]](id int, name varchar(20))");
      await util.knex.schema.raw("INSERT INTO [my[socks]]](id, name) VALUES (1, 'blue')");
    })

    afterAll(async () => {
      const testDbName = 'beekeeper_test_db'
      const config = {
        client: 'sqlserver',
        host: container.getHost(),
        port: container.getMappedPort(1433),
        user: 'sa',
        password: 'Example*1',
        trustServerCertificate: true,
        readOnlyMode: readonly
      } as IDbConnectionServerConfig

      await util.disconnect()

      // Drop the test database
      try {
        const masterUtil = new DBTestUtil(config, "master", { defaultSchema: 'dbo', dialect: 'sqlserver'})
        await masterUtil.connection.connect()
        await masterUtil.knex.schema.raw(`DROP DATABASE ${testDbName}`)
        await masterUtil.disconnect()
      } catch (e) {
        // Ignore errors during cleanup
      }

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

    describe("Param tests", () => {
      it("Should be able to handle named (:name) params", async () => {
        await util.paramTest([':param1', ':param2', ':param3']);
      })
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

      it("should properly filter foreign keys by schema", async () => {
        // Skip in read-only mode
        if (readonly) return;

        // Create test schemas and tables with separate statements
        await util.knex.raw(`CREATE SCHEMA schema_test_1`);
        await util.knex.raw(`CREATE SCHEMA schema_test_2`);

        await util.knex.raw(`
          CREATE TABLE schema_test_1.parent (
            id INT PRIMARY KEY
          )
        `);

        await util.knex.raw(`
          CREATE TABLE schema_test_2.parent (
            id INT PRIMARY KEY
          )
        `);

        await util.knex.raw(`
          CREATE TABLE schema_test_1.child (
            id INT PRIMARY KEY,
            parent_id INT,
            CONSTRAINT FK_Child_Parent_1 FOREIGN KEY (parent_id) REFERENCES schema_test_1.parent(id)
          )
        `);

        await util.knex.raw(`
          CREATE TABLE schema_test_2.child (
            id INT PRIMARY KEY,
            parent_id INT,
            CONSTRAINT FK_Child_Parent_2 FOREIGN KEY (parent_id) REFERENCES schema_test_2.parent(id)
          )
        `);

        // Get foreign keys from schema_test_1
        const keys1 = await util.connection.getTableKeys('child', 'schema_test_1');

        // Get foreign keys from schema_test_2
        const keys2 = await util.connection.getTableKeys('child', 'schema_test_2');

        // Verify foreign keys from schema_test_1 refer to the correct parent table
        expect(keys1.length).toBe(1);
        expect(keys1[0].fromSchema).toBe('schema_test_1');
        expect(keys1[0].fromTable).toBe('child');
        expect(keys1[0].toSchema).toBe('schema_test_1');
        expect(keys1[0].toTable).toBe('parent');

        // Verify foreign keys from schema_test_2 refer to the correct parent table
        expect(keys2.length).toBe(1);
        expect(keys2[0].fromSchema).toBe('schema_test_2');
        expect(keys2[0].fromTable).toBe('child');
        expect(keys2[0].toSchema).toBe('schema_test_2');
        expect(keys2[0].toTable).toBe('parent');

        // Verify no cross-schema references
        expect(keys1.some(k => k.toSchema === 'schema_test_2')).toBe(false);
        expect(keys2.some(k => k.toSchema === 'schema_test_1')).toBe(false);

        // Clean up created schemas and tables (in reverse order of creation)
        try {
          await util.knex.raw(`DROP TABLE schema_test_1.child`);
          await util.knex.raw(`DROP TABLE schema_test_2.child`);
          await util.knex.raw(`DROP TABLE schema_test_1.parent`);
          await util.knex.raw(`DROP TABLE schema_test_2.parent`);
          await util.knex.raw(`DROP SCHEMA schema_test_1`);
          await util.knex.raw(`DROP SCHEMA schema_test_2`);
        } catch (e) {
          console.warn('Failed to clean up schema test objects:', e);
        }
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

    // Regression test for #2476 -> routine create script truncates large procedures
    it("Should be able to get routine create script", async () => {
      if (readonly) return;

      const routineName = 'sp_test_routine';
      const query = fs.readFileSync(path.resolve(__dirname, './scripts/large-stored-proc.sqlserver.sql'), 'utf-8');

      await util.knex.raw(query);

      const result = await util.connection.getRoutineCreateScript(routineName);
      const scriptStr = Array.isArray(result) ? result[0] : result;
      expect(scriptStr.length).toBeGreaterThan(4000);
    })
  })
}

TEST_VERSIONS.forEach(({ version, readonly }) => testWith(version, readonly));
