import _ from "lodash";
import { readFileSync } from "fs";
import pg, { PoolClient, PoolConfig } from "pg";
import logRaw from "@bksLogger";
import { DatabaseConnection } from "@/lib/db/clients/DatabaseConnection";
import type { IDbConnectionServer } from "@/lib/db/backendTypes";
import { refreshTokenIfNeeded } from "@/lib/db/clients/utils";
import BksConfig from "@/common/bksConfig";
import { AzureAuthService } from "@/lib/db/authentication/azure";
// FIXME (azmi): use BksConfig
import globals from "@/common/globals";
import { HasPool } from "@/lib/db/clients/postgresql/types";

const log = logRaw.scope("PsqlConnection");

export class PsqlConnection extends DatabaseConnection<PoolClient> {
  private interval: NodeJS.Timeout | null = null;
  private conn: HasPool;

  protected async doConnect(): Promise<void> {
    const dbConfig = await this.configDatabase(this.server, this.database);

    log.info("CONFIG: ", dbConfig);

    this.conn = {
      pool: new pg.Pool(dbConfig),
    };

    const test = await this.conn.pool.connect();

    if (this.server.config.iamAuthOptions?.iamAuthenticationEnabled) {
      this.interval = setInterval(async () => {
        try {
          const newPassword = await refreshTokenIfNeeded(
            this.server.config.iamAuthOptions,
            this.server,
            this.server.config.port || 5432
          );

          const newPool = new pg.Pool({
            ...dbConfig,
            password: newPassword,
          });

          const test = await newPool.connect();
          test.release();

          if (this.conn?.pool) {
            await this.conn.pool.end();
          }
          this.conn = { pool: newPool };

          log.info("Token refreshed successfully and connection pool updated.");
        } catch (err) {
          log.error("Could not refresh token or update connection pool!", err);
        }
        // FIXME (azmi): use BksConfig
      }, globals.iamRefreshTime);
    }

    test.release();

    this.conn.pool.on("acquire", (client) => {
      log.debug("Pool event: connection acquired");
      client.on("error", this.handleError);
    });

    this.conn.pool.on("error", (err, _client) => {
      log.error("Pool event: connection error:", err.name, err.message);
    });

    // @ts-ignore
    this.conn.pool.on("release", (err, client) => {
      log.debug("Pool event: connection released");
      client.off("error", this.handleError);
    });

    log.debug("connected");
  }

  protected async doDisconnect(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
    }
    if (this.conn.pool.ended) {
      return;
    }
    await this.conn.pool.end();
  }

  protected async doGetClient(): Promise<PoolClient> {
    return await this.conn.pool.connect();
  }

  protected isConnectionLostError(err: any): boolean {
    const stringifiedErr = String(err);
    return (
      ("code" in err && err.code === "ECONNRESET") ||
      stringifiedErr.includes("Connection terminated unexpectedly") ||
      stringifiedErr.includes("Database connection lost")
    );
  }

  protected async configDatabase(
    server: IDbConnectionServer,
    database: { database: string }
  ) {
    let iamToken = undefined;
    if (server.config.iamAuthOptions?.iamAuthenticationEnabled) {
      iamToken = await refreshTokenIfNeeded(
        server.config?.iamAuthOptions,
        server,
        server.config.port || 5432
      );
    }

    const config: PoolConfig = {
      host: server.config.host,
      port: server.config.port || undefined,
      password: iamToken || server.config.password || undefined,
      database: database.database,
      max: BksConfig.db.postgres.maxConnections, // max idle connections per time (30 secs)
      connectionTimeoutMillis: BksConfig.db.postgres.connectionTimeout,
      idleTimeoutMillis: BksConfig.db.postgres.idleTimeout,
    };

    if (server.config.azureAuthOptions?.azureAuthEnabled) {
      const authService = new AzureAuthService();
      config.user = server.config.user;
      return authService.configDB(server, config);
    }

    if (
      server.config.client === "postgresql" &&
      // fix https://github.com/beekeeper-studio/beekeeper-studio/issues/2630
      // we only need SSL for iam authentication
      server.config?.iamAuthOptions?.iamAuthenticationEnabled
    ) {
      server.config.ssl = true;
    }

    return this.configurePool(config, server, null);
  }

  protected configurePool(
    config: PoolConfig,
    server: IDbConnectionServer,
    tempUser: string
  ) {
    if (tempUser) {
      config.user = tempUser;
    } else if (server.config.user) {
      config.user = server.config.user;
    } else if (server.config.osUser) {
      config.user = server.config.osUser;
    }

    if (server.config.socketPathEnabled) {
      config.host = server.config.socketPath;
      config.port = server.config.port;
      return config;
    }

    if (server.sshTunnel) {
      config.host = server.config.localHost;
      config.port = server.config.localPort;
    }

    if (server.config.ssl) {
      config.ssl = {};

      if (server.config.sslCaFile) {
        config.ssl.ca = readFileSync(server.config.sslCaFile);
      }

      if (server.config.sslCertFile) {
        config.ssl.cert = readFileSync(server.config.sslCertFile);
      }

      if (server.config.sslKeyFile) {
        config.ssl.key = readFileSync(server.config.sslKeyFile);
      }
      if (!config.ssl.key && !config.ssl.ca && !config.ssl.cert) {
        // TODO: provide this as an option in settings
        // not per-connection
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
