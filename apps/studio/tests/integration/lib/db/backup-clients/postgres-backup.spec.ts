import { GenericContainer, StartedTestContainer } from "testcontainers";
import { DBTestUtil, dbtimeout } from "../../../../lib/db";
import fs from 'fs'
import os from 'os'
import path from 'path'
import { IDbConnectionServerConfig } from "@/lib/db/types";
import { CommandClients, commandClientsFor } from "@/lib/db/CommandClient";
import { IConnection } from "@/common/interfaces/IConnection";
import { BackupConfig } from "@/lib/db/models/BackupConfig";
import { BackupTestConfig, runBackupTests } from "./all";
import { installUtilStub, UtilStub } from "./setup";

const TEST_CONFIGS: Array<BackupTestConfig> = [
  {
    description: "Plain text backup, create/drop database",
    backup: {
      createDatabase: true,
      dropDatabase: true,
      format: "p",
    },
    restore: {}
  },
  {
    description: "Directory backup, discard owners, schema only",
    backup: {
      discardOwners: true,
      format: "d",
      schemaOnly: true,
    },
    restore: {
      isDir: true,
    }
  },
  {
    description: "Tar backup, no privileges, insert rows",
    backup: {
      format: "t",
      noBackupPrivileges: true,
      sqlInsert: true
    },
    restore: {}
  },
  {
    description: "Custom backup, data only, compressed",
    backup: {
      dataOnly: true,
      format: "c",
      compression: "9"
    },
    restore: {}
  },
  {
    description: "Plain text backup with spaces in filename",
    backup: {
      format: "p",
      filename: "Postgres dump with spaces"
    },
    restore: {}
  },
  {
    description: "Custom backup with spaces in filename",
    backup: {
      format: "c",
      filename: "Postgres custom (compressed)"
    },
    restore: {}
  },
  {
    description: "Tar backup with spaces in filename",
    backup: {
      format: "t",
      filename: "Postgres tar dump"
    },
    restore: {}
  },
  {
    description: "Plain text backup with spaces in output directory",
    backup: {
      format: "p",
      filename: "dump with spaces"
    },
    restore: {},
    outputDirSuffix: "psql backups (test)"
  },
  {
    description: "Directory backup with spaces in output directory",
    backup: {
      format: "d",
    },
    restore: {
      isDir: true,
    },
    outputDirSuffix: "psql dir backups (test)"
  }
]

function testWith(description: string, backupConfig: Partial<BackupConfig>, restoreConfig: Partial<BackupConfig>, outputDirSuffix?: string) {
  describe(`Postgresql: Can Create and restore backups: ${description}`, () => {

    let container: StartedTestContainer;
    let config: IDbConnectionServerConfig;
    let util: DBTestUtil;
    let clients: CommandClients;
    let stub: UtilStub;
    jest.setTimeout(dbtimeout)

    beforeAll(async () => {
      stub = installUtilStub();
      const timeoutDefault = 10000;
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), `psql-`));
      fs.chmodSync(temp, "777")
      container = await new GenericContainer(`postgres:latest`)
        .withEnvironment({
          "POSTGRES_PASSWORD": "example",
          "POSTGRES_DB": "banana"
        })
        .withExposedPorts(5432)
        .withBindMounts([{
          source: path.join(temp, "postgresql"),
          target: "/var/run/postgresql",
          mode: "rw"
        }])
        .withStartupTimeout(dbtimeout)
        .start();

      config = {
        client: 'postgresql',
        host: container.getHost(),
        port: container.getMappedPort(5432),
        user: 'postgres',
        password: 'example',
        osUser: 'foo',
        ssh: null,
        sslCaFile: null,
        sslCertFile: null,
        sslKeyFile: null,
        sslRejectUnauthorized: false,
        ssl: false,
        domain: null,
        socketPath: null,
        socketPathEnabled: false,
        readOnlyMode: false
      };

      util = new DBTestUtil(config, "banana", { dialect: 'postgresql', defaultSchema: 'public' });
      await util.setupdb();

      clients = commandClientsFor('postgresql');

      clients.backup.serverConfig = config;
      clients.restore.serverConfig = config;

      const iConn: IConnection = {
        defaultDatabase: 'banana',
        username: config.user,
        password: config.password,
        host: config.host,
        port: config.port,
      } as IConnection;

      clients.backup.connConfig = iConn;
      clients.restore.connConfig = iConn;
      jest.setTimeout(timeoutDefault);
    })

    describe("Common Tests", () => {
      runBackupTests(() => {
        const skipRestoreRun = backupConfig.format === 'p';
        const skipDataChecks = backupConfig.schemaOnly;
        return {
          dialect: 'psql',
          backup: clients.backup,
          restore: clients.restore,
          backupConfig,
          restoreConfig,
          outputDirSuffix,
          skipRestoreRun,
          beforeRestore: skipRestoreRun || skipDataChecks ? undefined : async () => {
            await util.knex.raw('DELETE FROM test_param');
          },
          verifyRestore: skipRestoreRun || skipDataChecks ? undefined : async () => {
            const rows = await util.knex('test_param').where({ data: 'River Song' });
            expect(rows.length).toBeGreaterThan(0);
          },
        }
      })
    })

    afterAll(async () => {
      await util.disconnect();

      if (container) {
        await container.stop()
      }
      await stub?.dispose();
    })
  })
}


TEST_CONFIGS.forEach(({description, backup, restore, outputDirSuffix}) => testWith(description, backup, restore, outputDirSuffix))
