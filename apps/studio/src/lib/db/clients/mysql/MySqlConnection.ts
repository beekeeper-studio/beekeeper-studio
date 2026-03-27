import mysql from "mysql2";
import rawLog from "@bksLogger";
import ed25519AuthPlugin from "@coresql/mysql2-auth-ed25519";
import { readFileSync } from "fs";
import _ from "lodash";
import { refreshTokenIfNeeded } from "../utils";
import { IDbConnectionDatabase } from "../../types";
import BksConfig from "@/common/bksConfig";
import { uuidv4 } from "@/lib/uuid";
import { IDbConnectionServer } from "../../backendTypes";
import globals from "../../../../common/globals";
import { AzureAuthService } from "@/lib/db/authentication/azure";
import {
  ConnectionPoolOptions,
  DatabaseConnection,
} from "@/lib/db/clients/DatabaseConnection";

const log = rawLog.scope("MySqlConnection");

const mysqlErrors = {
  EMPTY_QUERY: "ER_EMPTY_QUERY",
  CONNECTION_LOST: "PROTOCOL_CONNECTION_LOST",
};

function getRealError(conn, err) {
  /* eslint no-underscore-dangle:0 */
  if (conn && conn._protocol && conn._protocol._fatalError) {
    log.warn("Query error", err, conn._protocol._fatalError);
    return conn._protocol._fatalError;
  }
  return err;
}

type ResultType = {
  tableName?: string;
  rows: any[];
  columns: mysql.FieldPacket[];
  arrayMode: boolean;
};

export class MySqlConnection extends DatabaseConnection<mysql.PoolConnection> {
  private conn: {
    pool: mysql.Pool;
  };
  private interval: NodeJS.Timeout;
  private clientId: string;

  constructor(options: ConnectionPoolOptions) {
    super(options);
    this.clientId = uuidv4();
  }

  runQuery(
    query: string,
    options: {
      connection: mysql.PoolConnection;
      rowsAsArray?: boolean;
      params?: any;
    }
  ): Promise<ResultType> {
    const params =
      !options.params || _.isEmpty(options.params) ? undefined : options.params;
    return new Promise<ResultType>((resolve, reject) => {
      log.info(`Running Query`, query, params);
      options.connection.query(
        {
          sql: query,
          values: params,
          rowsAsArray: options.rowsAsArray,
        },
        (err, data, fields) => {
          if (err && err.code === mysqlErrors.EMPTY_QUERY) {
            return resolve({ rows: [], columns: [], arrayMode: undefined });
          }

          if (err) {
            this.handleError(err);
            return reject(getRealError(options.connection, err));
          }

          log.info(`Running Query Finished`);
          resolve({
            rows: data as any[],
            columns: fields,
            arrayMode: options.rowsAsArray,
          });
        }
      );
    });
  }

  protected async doConnect(): Promise<void> {
    const dbConfig = await this.configDatabase(this.server, this.database);
    log.debug("create driver client for mysql with config %j", dbConfig);

    this.conn = {
      pool: mysql.createPool(dbConfig),
    };

    if (this.server.config.iamAuthOptions?.iamAuthenticationEnabled) {
      this.interval = setInterval(async () => {
        try {
          this.conn.pool.getConnection(async (err, connection) => {
            if (err) throw err;
            connection.config.password = await refreshTokenIfNeeded(
              this.server.config.iamAuthOptions,
              this.server,
              this.server.config.port || 3306
            );
            connection.release();
            log.info("Token refreshed successfully.");
          });
        } catch (err) {
          log.error("Could not refresh token!");
        }
      }, globals.iamRefreshTime);
    }

    this.conn.pool.on("acquire", (connection) => {
      log.debug(
        "Pool connection %d acquired on %s",
        connection.threadId,
        this.clientId
      );
    });

    this.conn.pool.on("release", (connection) => {
      log.debug(
        "Pool connection %d released on %s",
        connection.threadId,
        this.clientId
      );
    });

    this.conn.pool.on("error", (err) => {
      log.error("Pool event: connection error:", err.name, err.message);
    });
  }

  protected async doDisconnect(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.conn?.pool.end();
  }

  protected doGetClient(): Promise<mysql.PoolConnection> {
    return new Promise((resolve, reject) => {
      this.conn.pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });
  }

  protected isConnectionLostError(err: any): boolean {
    const stringifiedErr = String(err);
    return (
      ("code" in err && err.code === "PROTOCOL_CONNECTION_LOST") ||
      stringifiedErr.includes("Connection terminated unexpectedly") ||
      stringifiedErr.includes("Database connection lost") ||
      stringifiedErr.includes("The server closed the connection")
    );
  }

  protected async configDatabase(
    server: IDbConnectionServer,
    database: IDbConnectionDatabase
  ): Promise<mysql.PoolOptions> {
    let iamToken = undefined;
    if (server.config.iamAuthOptions?.iamAuthenticationEnabled) {
      iamToken = await refreshTokenIfNeeded(
        server.config?.iamAuthOptions,
        server,
        server.config.port || 5432
      );
    }

    const config: mysql.PoolOptions = {
      authPlugins: {
        client_ed25519: ed25519AuthPlugin(),
      },
      host: server.config.host,
      port: server.config.port,
      user: server.config.user,
      password: iamToken || server.config.password || undefined,
      database: database.database,
      multipleStatements: true,
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      connectionLimit: BksConfig.db.mysql.maxConnections,
      connectTimeout: BksConfig.db.mysql.connectTimeout,
    };

    if (server.config.azureAuthOptions?.azureAuthEnabled) {
      const authService = new AzureAuthService();
      return authService.configDB(server, config);
    }

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

    if (server.config.iamAuthOptions?.iamAuthenticationEnabled) {
      server.config.ssl = true;
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
