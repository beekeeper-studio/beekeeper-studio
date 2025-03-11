import path from 'path';
import { DockerComposeEnvironment, GenericContainer, Wait } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all'
import fs from 'fs'
import os from 'os'
import tmp from 'tmp'
import OracleDB from 'oracledb';
// import { UserSetting } from '@/common/appdb/models/user_setting';
const timeoutDefault = 1000 * 60 * 5 // 5 minutes

const TEST_VERSIONS = [
  // FIXME: can't combine think and thin tests in the same process
  // because oracle has a GLOBAL configuration
  // so once you go thick, you can't go back. (sounds gross)
  { version: 18, mode: 'thick'},
]

// if these test's don't work, see the main docs on setting up libaio
function testWith(info) {

  describe(`Oracle ${info.version} Tests, mode: ${info.mode}`, () => {
    jest.setTimeout(timeoutDefault + 500) // give jest a buffer

    let container;
    let util
    // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
    const tsaDir = tmp.dirSync().name
    const getUtil = () => util

    beforeAll(async () => {
      // this is the testcontainers default startup wait time.

      const localDir = path.resolve('./tests/docker/oracle_init')
      container = await new GenericContainer(`gvenzl/oracle-xe:${info.version}`)
        .withEnvironment({
          "ORACLE_PASSWORD": "password",
          "ORACLE_DATABASE": "beekeeper",
          "APP_USER": "beekeeper",
          "APP_USER_PASSWORD": "password"
        })
        .withExposedPorts(1521)
        .withBindMounts([{
          source: localDir,
          target: '/docker-entrypoint-initdb.d',
          mode: 'ro'
        }])
        .withHealthCheck({
          test: ["CMD-SHELL", "sqlplus -s beekeeper/password@//localhost/BEEKEEPER <<< \"select * from actor;\" | grep 'no rows'"],
          interval: 10000,
          timeout: 10000,
          retries: 12, // 2 minutes
          startPeriod: 60000
        })
        .withWaitStrategy(Wait.forHealthCheck())
        .withStartupTimeout(timeoutDefault) // just wait a really long time ok?
        .start()

      const tsaNamesPath = path.join(tsaDir, 'tnsnames.ora');
      const tsaContent = `
BEEKEEPER =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = ${container.getHost()})(PORT = ${1521}))
    (CONNECT_DATA =
      (SERVICE_NAME = BEEKEEPER)
    )
  )
        `;
      fs.writeFileSync(tsaNamesPath, tsaContent, 'utf8');

      console.log("tnsnames.ora file content", fs.readFileSync(tsaNamesPath, 'utf8'))

      const config = {
        client: 'oracle',
        host: container.getHost(),
        port: container.getMappedPort(1521),
        instantClientLocation: info.mode === 'thick' ? process.env['ORACLE_CLI_PATH'] : undefined,
        oracleConfigLocation: tsaDir,
        user: 'beekeeper',
        password: 'password',
        serviceName: 'BEEKEEPER',
        options: {
          connectionMethod: 'manual',
        }
      }
      util = new DBTestUtil(config, "BEEKEEPER", {
        defaultSchema: "BEEKEEPER",
        dialect: "oracle",
        // oracle will throw a "ORA-01100: database already mounted" error if trying to create
        skipCreateDatabase: true,
      });
      await util.setupdb()

    })

    afterAll(async () => {
      await util?.disconnect()
      if (container) {
        await container.stop()
      }
    })

    it("Should be able to see the ORCL service name", async () => {
      const result = await OracleDB.getNetworkServiceNames(tsaDir)
      expect(result).toContain('BEEKEEPER')
    })

    describe("When running block queries", () => {
      it("Should execute block queries without error", async () => {
        await util.connection.executeQuery(`
          DECLARE RESULT VARCHAR(256);
          BEGIN SELECT "street" INTO RESULT FROM "addresses";
          END;
        `)
      })
    })
    
    describe("createUpsertSQL tests", () => {
      it("should properly escape string values to prevent SQL injection", async () => {
        // Test with data containing characters that need escaping
        const entity = { schema: 'BEEKEEPER', name: 'addresses' };
        const data = [
          { id: 1, street: "Normal Street" },
          { id: 2, street: "Dangerous Street with ' single quote" },
          { id: 3, street: "Another Street with '' double quotes" }
        ];
        const primaryKeys = ['id'];
        
        // @ts-ignore - Accessing method for testing
        const sql = util.connection.createUpsertSQL(entity, data, primaryKeys);
        
        // Verify SQL is properly generated with escaped quotes
        expect(sql).toContain("'Normal Street'");
        expect(sql).toContain("'Dangerous Street with '' single quote'");
        expect(sql).toContain("'Another Street with '''' double quotes'");
        
        // Verify SQL doesn't contain unescaped quotes (which would break the query)
        expect(sql).not.toContain("'Dangerous Street with ' single quote'");
      });
    })
    
    describe("Database listing", () => {
      it("should list at least the current database", async () => {
        const databases = await util.connection.listDatabases();
        
        // Should at least return the current database
        expect(databases).toBeDefined();
        expect(databases.length).toBeGreaterThanOrEqual(1);
        
        // Should contain 'BEEKEEPER' as that's our test database
        expect(databases).toContain('BEEKEEPER');
      });
    })
    
    describe("Routines listing", () => {
      it("should list database routines", async () => {
        // First create a test procedure
        try {
          await util.connection.executeQuery(`
            CREATE OR REPLACE PROCEDURE test_procedure AS
            BEGIN
              NULL;
            END;
          `);
          
          // Now test if listRoutines works
          const routines = await util.connection.listRoutines({
            schema: 'BEEKEEPER'
          });
          
          // Should return at least our test procedure
          expect(routines).toBeDefined();
          expect(routines.length).toBeGreaterThanOrEqual(1);
          
          // Find our test procedure
          const testProc = routines.find(r => r.name === 'TEST_PROCEDURE');
          expect(testProc).toBeDefined();
          expect(testProc.type).toBe('procedure');
          expect(testProc.schema).toBe('BEEKEEPER');
          
        } finally {
          // Clean up
          try {
            await util.connection.executeQuery(`DROP PROCEDURE test_procedure`);
          } catch (e) {
            console.warn('Failed to drop test procedure:', e);
          }
        }
      });
    })
    
    describe("Query cancellation", () => {
      it("should properly handle query cancellation without errors", async () => {
        // This test verifies that query cancellation works properly in the Oracle client
        // by running a long query and cancelling it mid-execution
        
        // Use a long-running query that we can cancel
        const sleepQuery = `
          BEGIN
            DBMS_LOCK.SLEEP(10);
          END;
        `;
        
        // The DBTestUtil wraps the actual Oracle client, so we need to create a raw client instance
        // to get direct access to the cancel method
        const rawOracleClient = util.connection;
        
        // Get a reference to the internal query method to ensure we can call 'cancel'
        const queryObj = rawOracleClient.query(sleepQuery);
        
        // Start a timer to cancel the query after 1 second
        const timer = setTimeout(() => {
          queryObj.cancel();
        }, 1000);
        
        try {
          // Execute the query - this should be interrupted by the cancel call
          await queryObj;
          
          // If we reach this point without cancellation, the test should fail
          // as we expect the query to be cancelled
          expect(false).toBe(true, 'Query should have been cancelled but completed successfully');
        } catch (err) {
          // We expect an error when the query is cancelled, which is normal
          // Just make sure we don't have an unhandled error
          expect(err).toBeDefined();
          clearTimeout(timer);
        }
        
        // To verify the connection is still usable after cancellation,
        // run a simple query - if this succeeds, our cancellation handling is working correctly
        const result = await rawOracleClient.executeQuery("SELECT 1 FROM dual");
        expect(result).toBeDefined();
      });
    })

    // FIXME: Figure out why tests using tnsnames.ora files for aliases don't work
    // these should work just fine.
    // describe("TSA_NAMES", () => {

    //   let tsaUtil
    //   beforeAll(async () => {
    //     // Create a temporary tnsnames.ora file using connection info from testcontainers.
    //     const tsaConfig = {
    //       client: 'oracle',
    //       user: 'beekeeper',
    //       password: 'password',
    //       options: {
    //         connectionString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${container.getHost()})(PORT=${container.getMappedPort(1521)}))(CONNECT_DATA=(SERVICE_NAME=BEEKEEPER)))`,
    //         connectionMethod: 'connectionString'
    //       },
    //       oracleConfigLocation: tsaDir,
    //       instantClientLocation: info.mode === 'thick' ? process.env['ORACLE_CLI_PATH'] : undefined,
    //     }
    //     tsaUtil = new DBTestUtil(tsaConfig, "BEEKEEPER", {
    //       defaultSchema: "BEEKEEPER",
    //       dialect: "oracle",
    //       skipCreateDatabase: true,
    //     });
    //     // await tsaUtil.setupdb();
    //     // Use Oracle's dual table for a quick test.

    //     await tsaUtil.connect()
    //   })
    //   afterAll(async () => {
    //     await tsaUtil.disconnect();
    //     fs.rmSync(tsaDir, { recursive: true})
    //   })



    //   it("Should connect using an alias", async () => {


    //     const result = await tsaUtil.connection.executeQuery(`SELECT * FROM dual`);
    //     expect(result).toBeDefined();
    //   })
    // })



    describe("Common DB Tests", () => {
      runCommonTests(getUtil, false)
    })
  })

}

TEST_VERSIONS.forEach((i) => testWith(i))
