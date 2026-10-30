import mysql from "mysql2";
import _ from "lodash";
import { IDbConnectionDatabase } from "../../types";
import BksConfig from "@/common/bksConfig";
import { IDbConnectionServer } from "../../backendTypes";
import { MySqlConnector } from "../mysql/MySqlConnector";

export class MariaDBConnector extends MySqlConnector {
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
