import { IConnection } from "@/common/interfaces/IConnection";
import { CommandClients, commandClientsFor } from "@/lib/db/CommandClient";
import { BackupConfig } from "@/lib/db/models/BackupConfig";
import { IDbConnectionServerConfig } from "@/lib/db/types";
import tmp from 'tmp';
import { DBTestUtil } from "../../../../lib/db";
import { BackupTestConfig, runBackupTests } from "./all";
import { installUtilStub, UtilStub } from "./setup";

const TEST_CONFIGS: Array<BackupTestConfig> = [
  {
    description: "Plain text backup, no system tables",
    backup: {
      nosys: true,
    },
    restore: {}
  },
  {
    description: "Plain text backup, data only, newlines, with row-ids",
    backup: {
      dataOnly: true,
      newlines: true,
      preserveRowIds: true
    },
    restore: {}
  }
]

function testWith(description: string, backupConfig: Partial<BackupConfig>, restoreConfig: Partial<BackupConfig>) {
  describe(`SQLite: Can Create and restore backups: ${description}`, () => {
    let config: IDbConnectionServerConfig;
    let util: DBTestUtil;
    let clients: CommandClients;
    let stub: UtilStub;

    beforeAll(async () => {
      stub = installUtilStub();
      const dbfile = tmp.fileSync();

      config = {
        client: 'sqlite'
      } as IDbConnectionServerConfig;
      util = new DBTestUtil(config, dbfile.name, { dialect: 'sqlite' });
      await util.setupdb();

      clients = commandClientsFor('sqlite');

      clients.backup.serverConfig = config;
      clients.restore.serverConfig = config;

      const iConn: IConnection = {
        defaultDatabase: dbfile.name
      } as IConnection;

      clients.backup.connConfig = iConn;
      clients.restore.connConfig = iConn;
    })

    describe("Common Tests", () => {
      runBackupTests(() => {
        return {
          dialect: 'sqlite',
          backup: clients.backup,
          restore: clients.restore,
          backupConfig,
          restoreConfig
        }
      })
    })

    afterAll(async () => {
      await util?.disconnect();
      await stub?.dispose();
    })
  })
}

TEST_CONFIGS.forEach(({description, backup, restore}) => testWith(description, backup, restore))
