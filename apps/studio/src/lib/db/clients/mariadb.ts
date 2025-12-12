import { MysqlClient } from "./mysql";
import mysql from "mysql2";
import BksConfig from "@/common/bksConfig";
import { IDbConnectionDatabase } from '@/lib/db/types';
import { IDbConnectionServer } from "../backendTypes";

export class MariaDBClient extends MysqlClient {
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

  protected configDatabase(
    server: IDbConnectionServer,
    database: IDbConnectionDatabase
  ): mysql.PoolOptions {
    const config: mysql.PoolOptions = {
      host: server.config.host,
      port: server.config.port,
      user: server.config.user,
      password: server.config.password,
      database: database.database,
      multipleStatements: true,
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      connectionLimit: BksConfig.db.mariadb.maxConnections,
      connectTimeout: BksConfig.db.mariadb.connectTimeout,
    };

    if (server.config.socketPathEnabled) {
      config.socketPath = server.config.socketPath;
      config.host = null;
      config.port = null;
      return config;
    }

    if (server.sshTunnel) {
      config.host = server.config.localHost;
      config.port = server.config.localPort;
    }

    if (server.config.ssl) {
      config.ssl = {};

      if (server.config.sslCaFile) {
        /* eslint-disable-next-line */
        // @ts-ignore
        config.ssl.ca = readFileSync(server.config.sslCaFile);
      }

      if (server.config.sslCertFile) {
        /* eslint-disable-next-line */
        // @ts-ignore
        config.ssl.cert = readFileSync(server.config.sslCertFile);
      }

      if (server.config.sslKeyFile) {
        /* eslint-disable-next-line */
        // @ts-ignore
        config.ssl.key = readFileSync(server.config.sslKeyFile);
      }

      if (!config.ssl.key && !config.ssl.ca && !config.ssl.cert) {
        // TODO: provide this as an option in settings
        // or per-connection as 'reject self-signed certs'
        // How it works:
        // if false, cert can be self-signed
        // if true, has to be from a public CA
        // Heroku certs are self-signed.
        // if you provide ca/cert/key files, it overrides this
        config.ssl.rejectUnauthorized = false;
      } else {
        config.ssl.rejectUnauthorized = server.config.sslRejectUnauthorized;
      }
    }

    return config;
  }
}
