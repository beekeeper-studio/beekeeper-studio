import path from 'path';
import { DockerComposeEnvironment, GenericContainer, Wait } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all'
import fs from 'fs'
import os from 'os'
import tmp from 'tmp'
// import { UserSetting } from '@/common/appdb/models/user_setting';
const timeoutDefault = 1000 * 60 * 5 // 5 minutes


describe("Oracle Tests", () => {
  jest.setTimeout(timeoutDefault + 500) // give jest a buffer

  let container;
  let util
  // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

  const getUtil = () => util

  beforeAll(async () => {
    // this is the testcontainers default startup wait time.
    const localDir = path.resolve('./tests/docker/oracle_init')
    container = await new GenericContainer('gvenzl/oracle-xe:18')
      .withName('oracle')
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
    util = new DBTestUtil(config, "BEEKEEPER", {
      defaultSchema: "BEEKEEPER",
      dialect: "oracle",
      // oracle will throw a "ORA-01100: database already mounted" error if trying to create
      skipCreateDatabase: true,
    });
    await util.setupdb()

  })

  afterAll(async () => {
    await util.disconnect()
    if (container) {
      await container.stop()
    }
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


      describe("Connect using TSA_NAMES file", () => {
        it("Should connect using tsa_names.ora file and execute a simple select query", async () => {
          // Create a temporary tsanames.ora file using connection info from testcontainers.

          const tsaDir = tmp.dirSync().name
          const tsaNamesPath = path.join(tsaDir, 'tnsnames.ora');
          const tsaContent = `
    ORCL =
      (DESCRIPTION =
        (ADDRESS = (PROTOCOL = TCP)(HOST = ${container.getHost()})(PORT = ${container.getMappedPort(1521)}))
        (CONNECT_DATA =
          (SERVICE_NAME = BEEKEEPER)
        )
      )
          `;
          fs.writeFileSync(tsaNamesPath, tsaContent, 'utf8');
          const tsaConfig = {
            client: 'oracle',
            user: 'beekeeper',
            password: 'password',
            options: {
              connectionString: 'ORCL',
              connectionMethod: 'connectionString'
            },
            oracleConfigLocation: tsaDir,
          };
          const tsaUtil = new DBTestUtil(tsaConfig, "BEEKEEPER", {
            defaultSchema: "BEEKEEPER",
            dialect: "oracle",
            skipCreateDatabase: true,
          });
          // await tsaUtil.setupdb();
          // Use Oracle's dual table for a quick test.

          await tsaUtil.connect()
          const result = await tsaUtil.connection.executeQuery(`SELECT * FROM dual`);
          expect(result).toBeDefined();
          await tsaUtil.disconnect();
          fs.unlinkSync(tsaNamesPath);
        })
      })



  describe("Common DB Tests", () => {
    runCommonTests(getUtil, false)
  })
})
