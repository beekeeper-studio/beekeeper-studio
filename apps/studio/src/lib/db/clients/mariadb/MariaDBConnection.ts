import mysql from "mysql2";
import _ from "lodash";
import { IDbConnectionDatabase } from "../../types";
import BksConfig from "@/common/bksConfig";
import { IDbConnectionServer } from "../../backendTypes";
import { MySqlConnection } from "../mysql/MySqlConnection";

export class MariaDBConnection extends MySqlConnection {
  protected async configDatabase(
    server: IDbConnectionServer,
    database: IDbConnectionDatabase
  ): Promise<mysql.PoolOptions> {
    return {
      ...await super.configDatabase(server, database),
      connectionLimit: BksConfig.db.mariadb.maxConnections,
      connectTimeout: BksConfig.db.mariadb.connectTimeout,
    };
  }
}
