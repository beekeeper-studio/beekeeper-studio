import { MysqlClient } from "./mysql";
import { IDbConnectionDatabase } from '@/lib/db/types';
import { IDbConnectionServer } from "../backendTypes";
import { MariaDBConnectionPool } from "./mariadb/MariaDBConnectionPool";

export class MariaDBClient extends MysqlClient {
  pool: MariaDBConnectionPool;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(server, database);
    this.pool = new MariaDBConnectionPool({ server, database });
  }

  resolveDefault(defaultValue: string) {
    // adapted from https://github.com/PomeloFoundation/Pomelo.EntityFrameworkCore.MySql/pull/998/files
    if (!defaultValue) return null;

    if (defaultValue.toString().toLowerCase() === 'null') return null;

    if (
      defaultValue.startsWith("'") &&
      defaultValue.endsWith("'") &&
      defaultValue.length >= 2
    ) {
      // MariaDb escapes all single quotes with two single quotes in default value strings, even if they are
      // escaped with backslashes in the original `CREATE TABLE` statement.
      return defaultValue
        .substring(1, defaultValue.length - 1)
        .replaceAll("''", "'");
    }

    return defaultValue;
  }
}
