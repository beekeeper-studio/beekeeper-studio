import { readFileSync } from "fs";
import BksConfig from "@/common/bksConfig";
import { ConnectionError, ConnectionPool, Request, Transaction } from "mssql";
import { ConnectOptions, DatabaseConnection } from "../DatabaseConnection";
import { IDbConnectionServer } from "../../backendTypes";
import { IDbConnectionDatabase } from "../../types";
import logRaw from "@bksLogger";
import { AzureAuthService } from "../../authentication/azure";
import { getEntraOptions } from "../utils";

const log = logRaw.scope("SqlServerConnection");

type GetClientOptions = {
  type: "request" | "transaction";
};

export class SqlServerConnection extends DatabaseConnection<
  Request | Transaction,
  GetClientOptions
> {
  private pool: ConnectionPool;
  private authService: AzureAuthService;

  async request(): Promise<Request> {
    return await this.getClient({ type: "request" }) as Request;
  }

  async transaction(): Promise<Transaction> {
    return await this.getClient({ type: "transaction" }) as Transaction;
  }

  protected async doConnect(options: ConnectOptions): Promise<void> {
    const dbConfig = await this.configDatabase(
      this.server,
      this.database,
      options.signal
    );
    this.pool = await new ConnectionPool(dbConfig).connect();

    this.pool.on("error", (err) => {
      if (err instanceof ConnectionError) {
        log.error("Pool ConnectionError", err.message);
      }
      log.error("Pool event: connection error:", err.name, err.message);
      this.handleError(err);
    });

    log.debug("create driver client for mmsql with config %j", dbConfig);
  }

  protected async doDisconnect(): Promise<void> {
    if (!this.pool.connected) {
      return;
    }
    await this.pool.close();
  }

  protected async doGetClient(
    options: GetClientOptions
  ): Promise<Request | Transaction> {
    if (options.type === "request") {
      return this.pool.request();
    } else {
      return this.pool.transaction();
    }
  }

  protected isConnectionLostError(err: any): boolean {
    return err instanceof ConnectionError && err.code === "ESOCKET";
  }

  private async configDatabase(
    server: IDbConnectionServer,
    database: IDbConnectionDatabase,
    signal?: AbortSignal
  ): Promise<any> {
    // changed to any for now, might need to make some changes
    const config: any = {
      server: server.config.host,
      database: database.database,
      requestTimeout: Infinity,
      appName: "beekeeperstudio",
      pool: {
        max: BksConfig.db.sqlserver.maxConnections,
      },
    };

    if (server.config.azureAuthOptions?.azureAuthEnabled) {
      this.authService = new AzureAuthService();
      await this.authService.init(server.config.authId);

      const options = getEntraOptions(server, { signal });

      config.authentication = await this.authService.auth(
        server.config.azureAuthOptions.azureAuthType,
        options
      );

      config.options = {
        encrypt: true,
      };

      return config;
    }

    config.user = server.config.user;
    config.password = server.config.password;
    config.port = Number(server.config.port);

    if (server.config.domain) {
      config.domain = server.config.domain;
    }

    if (server.sshTunnel) {
      config.server = server.config.localHost;
      config.port = server.config.localPort;
    }

    config.options = {
      trustServerCertificate: server.config.trustServerCertificate,
    };

    if (server.config.ssl) {
      const options: any = {
        encrypt: server.config.ssl,
        cryptoCredentialsDetails: {},
      };

      if (server.config.sslCaFile) {
        options.cryptoCredentialsDetails.ca = readFileSync(
          server.config.sslCaFile
        );
      }

      if (server.config.sslCertFile) {
        options.cryptoCredentialsDetails.cert = readFileSync(
          server.config.sslCertFile
        );
      }

      if (server.config.sslKeyFile) {
        options.cryptoCredentialsDetails.key = readFileSync(
          server.config.sslKeyFile
        );
      }

      if (
        server.config.sslCaFile &&
        server.config.sslCertFile &&
        server.config.sslKeyFile
      ) {
        // trust = !reject
        // mssql driver reverses this setting for no obvious reason
        // other drivers simply pass through to the SSL library.
        options.trustServerCertificate = !server.config.sslRejectUnauthorized;
      }

      config.options = options;
    }

    return config;
  }
}
