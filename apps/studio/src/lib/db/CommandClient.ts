import { MySqlBackupClient, NotImplementedBackupClient, PostgresBackupClient, SqlServerBackupClient, SqliteBackupClient } from "./backup-clients";
import { MySqlRestoreClient, NotImplementedRestoreClient, PostgresRestoreClient, SqlServerRestoreClient, SqliteRestoreClient } from "./restore-clients";
import { BaseCommandClient } from "./BaseCommandClient";

export interface CommandClients {
  backup: BaseCommandClient,
  restore: BaseCommandClient
}

export function commandClientsFor(d: string): CommandClients {
  switch (d) {
      case 'postgresql':
        return {
          backup: new PostgresBackupClient(),
          restore: new PostgresRestoreClient()
        }
      case 'mariadb':
        return {
          backup: new MySqlBackupClient('mariadb-dump'),
          restore: new MySqlRestoreClient('mariadb')
        }
      case 'mysql':
        return {
          backup: new MySqlBackupClient('mysqldump'),
          restore: new MySqlRestoreClient('mysql')
        }
      case 'sqlserver':
        return {
          backup: new SqlServerBackupClient(),
          restore: new SqlServerRestoreClient(),
        }
      case 'sqlite':
        return {
          backup: new SqliteBackupClient(),
          restore: new SqliteRestoreClient()
        }
      case 'oracle':
      case 'cassandra':
      case 'bigquery':
      default:
        return {
          backup: new NotImplementedBackupClient(),
          restore: new NotImplementedRestoreClient()
        }
    }
}
