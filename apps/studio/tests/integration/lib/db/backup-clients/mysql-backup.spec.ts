import { CommandClients, commandClientsFor } from "@/lib/db/CommandClient";
import { BackupConfig } from "@/lib/db/models/BackupConfig";
import { IDbConnectionServerConfig } from "@/lib/db/types";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import fs from "fs";
import os from "os";
import path from "path";
import { DBTestUtil, dbtimeout } from "../../../../lib/db";
import { IConnection } from "@/common/interfaces/IConnection";
import { BackupTestConfig, runBackupTests } from "./all";
import { installUtilStub, UtilStub } from "./setup";

const TEST_CONFIGS: Array<BackupTestConfig> = [
  {
    description: "Plain text backup",
    backup: {
      dropDatabase: true,
      insertIgnore: true,
      sqlInsert: true
    },
    restore: {}
  }
]

function testWith(description: string, backupConfig: Partial<BackupConfig>, restoreConfig: Partial<BackupConfig>) {
  describe(`MySQL: Can Create and restore backups: ${description}`, () => {
    let container: StartedTestContainer;
    let config: IDbConnectionServerConfig;
    let util: DBTestUtil;
    let clients: CommandClients;
    let stub: UtilStub;
    jest.setTimeout(dbtimeout)

    beforeAll(async () => {
      const timeoutDefault = 10000;
      stub = installUtilStub();
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), `mysql-`));
      fs.chmodSync(temp, "777")
      container = await new GenericContainer('mysql:8')
        .withName("testbackupmysql")
        .withEnvironment({
          "MYSQL_ROOT_PASSWORD": "test",
          "MYSQL_DATABASE": "test"
        })
        .withExposedPorts(3306)
        .withStartupTimeout(dbtimeout)
        .withBindMounts([{
          source: temp,
          target: '/var/run/mysqld',
          mode: 'rw'
        }])
        .start();
      config = {
        client: 'mysql',
        host: container.getHost(),
        port: container.getMappedPort(3306),
        user: 'root',
        password: 'test',
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

      util = new DBTestUtil(config, "test", { dialect: 'mysql' });
      await util.setupdb();

      clients = commandClientsFor('mysql');

      clients.backup.serverConfig = config;
      clients.restore.serverConfig = config;

      const iConn: IConnection = {
        defaultDatabase: 'test',
        username: config.user,
        password: config.password,
        host: config.host,
        port: config.port
      } as IConnection;

      clients.backup.connConfig = iConn;
      clients.restore.connConfig = iConn;
      jest.setTimeout(timeoutDefault);
    })

    describe("Common Tests", () => {
      runBackupTests(() => {
        return {
          dialect: 'mysql',
          backup: clients.backup,
          restore: clients.restore,
          backupConfig,
          restoreConfig
        }
      })
    })

    afterAll(async () => {
      if (util?.connection) {
        await util.connection.disconnect();
      }
      if (container) {
        await container.stop()
      }
      stub?.dispose();
    })
  })
}

TEST_CONFIGS.forEach(({description, backup, restore}) => testWith(description, backup, restore))
