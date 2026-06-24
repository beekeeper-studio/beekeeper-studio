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

// Setup guide for SQL Server integrated / Kerberos authentication prerequisites.
const WIN_AUTH_DOCS_URL = 'https://docs.beekeeperstudio.io/user_guide/connecting/sql-server/'

// Wrap a promise with a JS-level deadline. msnodesqlv8/ODBC's native conn_timeout
// does NOT reliably cancel a stalled SQLDriverConnect -- it only covers the TCP
// connect, not the post-connect TDS prelogin / SSPI handshake -- so a stalled
// Kerberos/NTLM negotiation would otherwise hang indefinitely. This guarantees the
// attempt rejects; the orphaned native handle may persist, but the app stays
// responsive and surfaces a clear error instead of locking up.
function withDeadline<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer)) as Promise<T>;
}

type GetClientOptions = {
  type: "request" | "transaction";
};

export class SqlServerConnection extends DatabaseConnection<
  Request | Transaction,
  GetClientOptions
> {
  private pool: ConnectionPool;
  private authService: AzureAuthService;
  private dbConfig: any = {};

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

    if (this.server.config.windowsAuthEnabled) {
      this.pool = await this.connectWindowsAuth()
    } else {
      this.pool = await new ConnectionPool(dbConfig).connect();
    }

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
    if (this.pool && this.pool.connected) {
      await this.pool.close();
    }
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

    if (server.config.windowsAuthEnabled) {
      config.port = Number(server.config.port);

      if (server.sshTunnel) {
        config.server = server.config.localHost;
        config.port = server.config.localPort;
      }

      // trustedConnection delegates auth to the OS (SSPI -> Kerberos/NTLM) via msnodesqlv8.
      config.options = {
        trustedConnection: true,
        trustServerCertificate: server.config.trustServerCertificate,
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

  // SQL Server integrated authentication (SSPI). The OS/ODBC layer negotiates the
  // actual protocol: Kerberos when the host is domain-joined with a reachable KDC
  // and a matching SPN (typically connecting by hostname/FQDN), otherwise NTLM.
  // tedious cannot do this, so we route through the native msnodesqlv8 driver.
  // Works on Windows (SSPI) and on Linux/macOS when unixODBC + the Microsoft ODBC
  // Driver 18 + a Kerberos ticket (kinit) are configured on the host.
  private async connectWindowsAuth(): Promise<ConnectionPool> {
    let sqlWindows: any
    try {
      sqlWindows = require('mssql/msnodesqlv8')
    } catch {
      throw new Error(
        (process.platform === 'win32'
          ? 'Integrated authentication is unavailable: the msnodesqlv8 native module could not be loaded. Try reinstalling Beekeeper Studio.'
          : 'Integrated authentication is unavailable: the msnodesqlv8 native module could not be loaded. Install unixODBC and the Microsoft ODBC Driver 18 for SQL Server, then reinstall Beekeeper Studio.') +
        ` See ${WIN_AUTH_DOCS_URL} for setup.`
      )
    }

    const trustCert = this.dbConfig.options?.trustServerCertificate
    const server = this.dbConfig.server
    const port = this.dbConfig.port || 1433
    const CONNECT_TIMEOUT_S = 15

    // Driver discovery is folded into the real connect: try each candidate ODBC
    // driver with the actual connection and keep the first that opens. A missing
    // driver fails immediately at the ODBC driver-manager level (IM002, before any
    // network or auth), so only the driver that is present completes a single SSPI/
    // Kerberos handshake -- no throwaway probe connection, and the string that is
    // validated IS the string used. Modern drivers first (TLS 1.2 support); the
    // legacy built-in driver only exists on Windows and is a last resort.
    const candidates: { driver: string, legacy: boolean }[] = [
      { driver: 'ODBC Driver 18 for SQL Server', legacy: false },
      { driver: 'ODBC Driver 17 for SQL Server', legacy: false },
    ]
    if (process.platform === 'win32') {
      candidates.push({ driver: 'SQL Server', legacy: true })
    }

    // Set a connection-string clause, replacing it in place or appending it when
    // mssql's generated string omits it -- so the discovered driver and
    // Trusted_Connection are never silently dropped.
    const setClause = (connStr: string, key: string, value: string): string => {
      const re = new RegExp(`${key}=[^;]*`, 'i')
      return re.test(connStr)
        ? connStr.replace(re, `${key}=${value}`)
        : `${connStr.replace(/;?\s*$/, '')};${key}=${value}`
    }

    // Flatten every nested message out of an mssql/msnodesqlv8 error so a missing
    // driver can be told apart from a real auth/connect failure (mssql wraps native
    // errors and exposes them via originalError / precedingErrors).
    const errorText = (err: any): string => {
      const parts: string[] = []
      const visit = (e: any) => {
        if (!e) return
        if (typeof e === 'string') { parts.push(e); return }
        if (typeof e.message === 'string') parts.push(e.message)
        if (e.originalError) visit(e.originalError)
        if (Array.isArray(e.precedingErrors)) e.precedingErrors.forEach(visit)
      }
      if (Array.isArray(err)) err.forEach(visit); else visit(err)
      return parts.join('; ')
    }
    const isDriverMissing = (text: string): boolean =>
      /IM002|IM003|data source name not found|specified driver could not be loaded|can'?t open lib|file not found/i.test(text)

    const driverMissingError = () => new Error(
      (process.platform === 'win32'
        ? 'Integrated authentication requires an ODBC Driver for SQL Server. Install "ODBC Driver 18 for SQL Server" (or 17) from Microsoft.'
        : 'Integrated authentication requires unixODBC and the Microsoft "ODBC Driver 18 for SQL Server" installed on this machine.') +
      ` See ${WIN_AUTH_DOCS_URL} for setup.`
    )

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      // mssql ignores the driver name and emits Trusted_Connection as a boolean
      // (ODBC needs yes/no); set both, plus TrustServerCertificate when asked.
      const connecting = new sqlWindows.ConnectionPool({
        ...this.dbConfig,
        connectionTimeout: CONNECT_TIMEOUT_S * 1000,
        beforeConnect: (cfg: any) => {
          cfg.conn_str = setClause(cfg.conn_str, 'Driver', `{${candidate.driver}}`)
          cfg.conn_str = setClause(cfg.conn_str, 'Trusted_Connection', 'yes')
          if (trustCert) cfg.conn_str = setClause(cfg.conn_str, 'TrustServerCertificate', 'yes')
          cfg.conn_timeout = CONNECT_TIMEOUT_S
        }
      }).connect()

      try {
        const pool = await withDeadline(
          connecting,
          CONNECT_TIMEOUT_S * 1000,
          `Integrated authentication timed out after ${CONNECT_TIMEOUT_S}s connecting to ${server},${port} with Driver={${candidate.driver}}. ` +
          `The server is reachable but the SSPI/Kerberos login handshake did not complete in time. ` +
          `Check the SQL Server SPN registration and that the current user's Kerberos ticket (kinit) or NTLM fallback can reach a domain controller.`
        )
        if (candidate.legacy) {
          log.warn('Integrated authentication is using the legacy "{SQL Server}" ODBC driver, ' +
            'which does not support TLS 1.2. Install "ODBC Driver 18 for SQL Server" (or 17) from Microsoft for secure connections.')
        }
        return pool
      } catch (err) {
        // A missing driver is not fatal while other candidates remain; advance to
        // the next. Any other failure (auth, unreachable, or the withDeadline
        // timeout above) is real and already carries a useful message.
        if (isDriverMissing(errorText(err))) {
          if (i < candidates.length - 1) continue
          throw driverMissingError()
        }
        throw err instanceof Error ? err : new Error(errorText(err))
      }
    }

    // Only reached if the candidate list is empty (it never is).
    throw driverMissingError()
  }
}
