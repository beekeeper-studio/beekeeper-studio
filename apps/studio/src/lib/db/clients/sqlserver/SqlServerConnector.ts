import { readFileSync } from "fs";
import BksConfig from "@/common/bksConfig";
import sql, { ConnectionError, ConnectionPool, Request, Transaction } from "mssql";
import { ConnectOptions, DatabaseConnector } from "../DatabaseConnector";
import { IDbConnectionServer } from "../../backendTypes";
import { IDbConnectionDatabase } from "../../types";
import logRaw from "@bksLogger";
import { AzureAuthService } from "../../authentication/azure";
import { getEntraOptions } from "../utils";
import { buildWindowsAuthConnStr } from "../sqlserverWinAuth";
import { parseSqlServerHost } from "../sqlserverHost";
import { bindDriver } from "../sqlserverDriver";

const log = logRaw.scope("SqlServerConnector");

// Setup guide for SQL Server integrated / Kerberos authentication prerequisites.
const WIN_AUTH_DOCS_URL = 'https://docs.beekeeperstudio.io/user_guide/connecting/sql-server/'

// Username/password and Entra connections use tedious. Bound so a later integrated-auth
// attempt (which loads mssql/msnodesqlv8) can't swap its Request class -- see sqlserverDriver.ts.
const TediousConnectionPool = bindDriver(sql)

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

// Flatten every nested message out of an mssql/msnodesqlv8 error: mssql wraps driver
// errors and exposes the real cause via originalError / precedingErrors, so the outermost
// message alone is rarely enough to classify a failure.
export function flattenErrorText(err: any): string {
  const parts: string[] = []
  const visit = (e: any) => {
    if (!e) return
    if (typeof e === 'string') { parts.push(e); return }
    if (typeof e.message === 'string') parts.push(e.message)
    if (typeof e.code === 'string') parts.push(e.code)
    if (e.originalError) visit(e.originalError)
    if (Array.isArray(e.precedingErrors)) e.precedingErrors.forEach(visit)
  }
  if (Array.isArray(err)) err.forEach(visit); else visit(err)
  return parts.join('; ')
}

// Every stock SQL Server presents a self-signed certificate and tedious has validated by
// default since v16, so this is the first wall a correct host + password hits.
const SELF_SIGNED_CERT_PATTERN =
  /self[-\s]?signed certificate|unable to verify the first certificate|SELF_SIGNED_CERT_IN_CHAIN/i

export const sqlServerConnectHints = {
  selfSignedCertificate:
    'The server presented a self-signed certificate. Enable "Trust Server Certificate" in the ' +
    'SQL Server options, or configure the server with a certificate the OS trusts.',
  browserUnreachable: (host: string, instanceName: string): string =>
    `No response from the SQL Server Browser service on ${host} (UDP 1434), required to resolve ` +
    `instance ${instanceName}. Start the SQL Server Browser service, allow UDP 1434 through the ` +
    `firewall, or enter the instance's static TCP port in the Port field.`,
}

// Both failure modes reach the user as something they cannot act on: a self-signed
// certificate reads as a bare TLS error with no hint that the fix is a checkbox, and an
// unreachable SQL Server Browser as a flat 15s timeout that never mentions UDP 1434.
// The browser case is keyed off the built config rather than the driver's text -- that text
// is inconsistent (a generic "Failed to connect ... in 15000ms" in testing, not tedious's
// "Failed to get response from SQL Server Browser") and options.instanceName is set exactly
// when the connection depends on a browser lookup.
export function sqlServerConnectHint(err: any, config: any): string | null {
  if (SELF_SIGNED_CERT_PATTERN.test(flattenErrorText(err))) {
    return sqlServerConnectHints.selfSignedCertificate
  }

  const instanceName = config?.options?.instanceName
  if (instanceName) return sqlServerConnectHints.browserUnreachable(config.server, instanceName)

  return null
}

// Keep the driver's own text (and the original error) and append the remedy, so logs lose
// nothing and the connection screen gains the one sentence that resolves the failure.
function withConnectHint(err: any, config: any): any {
  const hint = sqlServerConnectHint(err, config)
  if (!hint) return err

  const message = ((err instanceof Error && err.message) || flattenErrorText(err) || String(err)).trim()
  // The connection screen renders this as one line, so join rather than stack.
  const separator = /[.!?]$/.test(message) ? ' ' : '. '
  const decorated: any = new Error(`${message}${separator}${hint}`)
  decorated.originalError = err
  if (err?.code) decorated.code = err.code
  return decorated
}

type GetRawConnectionOptions = {
  type: "request" | "transaction";
};

export class SqlServerConnector extends DatabaseConnector<
  Request | Transaction,
  GetRawConnectionOptions
> {
  private pool: ConnectionPool;
  private authService: AzureAuthService;
  private dbConfig: any = {};

  async request(): Promise<Request> {
    return await this.getRawConnection({ type: "request" }) as Request;
  }

  async transaction(): Promise<Transaction> {
    return await this.getRawConnection({ type: "transaction" }) as Transaction;
  }

  protected async doConnect(options: ConnectOptions): Promise<void> {
    this.dbConfig = await this.configDatabase(
      this.server,
      this.database,
      options.signal
    );

    try {
      if (this.server.config.windowsAuthEnabled) {
        this.pool = await this.connectWindowsAuth();
      } else {
        this.pool = await new TediousConnectionPool(this.dbConfig).connect();
      }
    } catch (err) {
      throw withConnectHint(err, this.dbConfig);
    }

    this.pool.on("error", (err) => {
      if (err instanceof ConnectionError) {
        log.error("Pool ConnectionError", err.message);
      }
      log.error("Pool event: connection error:", err.name, err.message);
      this.handleError(err);
    });

    log.debug("create driver client for mmsql with config %j", this.dbConfig);
  }

  protected async doDisconnect(): Promise<void> {
    if (this.pool && this.pool.connected) {
      await this.pool.close();
    }
  }

  protected async doGetClient(
    options: GetRawConnectionOptions
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

  // SQL Server integrated authentication (SSPI). The OS/ODBC layer negotiates the
  // actual protocol: Kerberos when the host is domain-joined with a reachable KDC
  // and a matching SPN (typically connecting by hostname/FQDN), otherwise NTLM.
  // tedious cannot do this, so we route through the native msnodesqlv8 driver.
  // Works on Windows (SSPI) and on Linux/macOS when unixODBC + the Microsoft ODBC
  // Driver 18 + a Kerberos ticket (kinit) are configured on the host.
  private async connectWindowsAuth(): Promise<ConnectionPool> {
    let sqlWindows: any
    try {
      // Dynamic import (not require) so the load stays lazy under every build
      // pipeline: vite-plugin-commonjs hoists bare require() calls into eager
      // top-level imports, which would make this optional Windows-only native
      // a hard dependency.
      const mod: any = await import('mssql/msnodesqlv8')
      sqlWindows = mod.default ?? mod
    } catch {
      throw new Error(
        (process.platform === 'win32'
          ? 'Integrated authentication is unavailable: the msnodesqlv8 native module could not be loaded. Try reinstalling Beekeeper Studio.'
          : 'Integrated authentication is unavailable: the msnodesqlv8 native module could not be loaded. Install unixODBC and the Microsoft ODBC Driver 18 for SQL Server, then reinstall Beekeeper Studio.') +
        ` See ${WIN_AUTH_DOCS_URL} for setup.`
      )
    }

    const WindowsConnectionPool = bindDriver(sqlWindows)
    const encryptionMode = this.dbConfig.options?.encryptionMode || 'on'
    const serverCertificate = this.dbConfig.options?.serverCertificate
    const serverSpn = this.dbConfig.options?.serverSpn
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
      const connecting = new WindowsConnectionPool({
        ...this.dbConfig,
        connectionTimeout: CONNECT_TIMEOUT_S * 1000,
        beforeConnect: (cfg: any) => {
          // Pin the discovered driver + Trusted_Connection, and translate the encryption mode
          // and SPN into ODBC clauses (see buildWindowsAuthConnStr for the exact mapping).
          cfg.conn_str = buildWindowsAuthConnStr(cfg.conn_str, {
            driver: candidate.driver,
            encryptionMode,
            serverCertificate,
            serverSpn,
          })
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
        if (isDriverMissing(flattenErrorText(err))) {
          if (i < candidates.length - 1) continue
          throw driverMissingError()
        }
        throw err instanceof Error ? err : new Error(flattenErrorText(err))
      }
    }

    // Only reached if the candidate list is empty (it never is).
    throw driverMissingError()
  }

  // Exposed (not private) so the built driver config can be asserted in unit tests without a
  // live server -- the host/port/instance decisions below are the whole fix for named instances.
  async configDatabase(server: IDbConnectionServer, database: IDbConnectionDatabase, signal?: AbortSignal): Promise<any> { // changed to any for now, might need to make some changes
    // `.`/`(local)` and stray whitespace never reach the driver, and the instance name is
    // split off here so config.server holds a bare host -- see parseSqlServerHost.
    const { host, instanceName } = parseSqlServerHost(server.config.host)

    const config: any = {
      server: host,
      database: database.database,
      requestTimeout: Infinity,
      appName: 'beekeeperstudio',
      pool: {
        max: BksConfig.db.sqlserver.maxConnections
      }
    };

    if (server.config.azureAuthOptions?.azureAuthEnabled) {
      this.authService = new AzureAuthService();
      await this.authService.init(server.config.authId)

      const options = getEntraOptions(server, { signal })

      config.authentication = await this.authService.auth(server.config.azureAuthOptions.azureAuthType, options);

      config.options = {
        encrypt: true
      };

      return config;
    }

    if (server.config.windowsAuthEnabled) {
      config.port = Number(server.config.port);

      // msnodesqlv8 rebuilds Server=host\instance from server + options.instanceName and the
      // ODBC driver runs its own browser lookup, so the instance is passed straight through.
      let winAuthInstance = instanceName;

      if (server.sshTunnel) {
        config.server = server.config.localHost;
        config.port = server.config.localPort;
        // A tunnel forwards one TCP port; a UDP 1434 browser lookup cannot follow it.
        winAuthInstance = undefined;
      }

      // trustedConnection delegates auth to the OS (SSPI -> Kerberos/NTLM) via msnodesqlv8.
      // The integrated-auth encryption/cert/SPN settings live in sqlServerOptions;
      // connectWindowsAuth() translates encryptionMode into the ODBC Encrypt/strict clauses.
      const sqlServerOptions = server.config.sqlServerOptions || {};
      config.options = {
        trustedConnection: true,
        instanceName: winAuthInstance,
        encryptionMode: sqlServerOptions.encryptionMode || 'on',
        serverCertificate: sqlServerOptions.serverCertificate || undefined,
        serverSpn: sqlServerOptions.serverSpn || undefined,
      };

      return config;
    }

    config.user = server.config.user;
    config.password = server.config.password;

    const port = Number(server.config.port);
    // mssql drops the port whenever an instance name is set, forcing a SQL Browser lookup.
    // Treat the client default of 1433 as "unspecified" so a user who knows the instance's
    // static port can bypass the browser, which is often stopped or firewalled. The Port
    // field cannot be left blank today, which is why the default doubles as the signal.
    let browserLookupInstance: string | undefined = undefined;

    if (instanceName) {
      if (Number.isFinite(port) && port > 0 && port !== 1433) {
        config.port = port;
      } else {
        browserLookupInstance = instanceName;
        delete config.port;
      }
    } else {
      config.port = port;
    }

    if (server.config.domain) {
      config.domain = server.config.domain
    }

    if (server.sshTunnel) {
      config.server = server.config.localHost;
      config.port = server.config.localPort;
      // A tunnel forwards one TCP port; a UDP 1434 browser lookup cannot follow it.
      browserLookupInstance = undefined;
    }

    config.options = { trustServerCertificate: server.config.trustServerCertificate }

    if (server.config.ssl) {
      const options: any = {
        encrypt: server.config.ssl,
        cryptoCredentialsDetails: {}
      }

      if (server.config.sslCaFile) {
        options.cryptoCredentialsDetails.ca = readFileSync(server.config.sslCaFile);
      }

      if (server.config.sslCertFile) {
        options.cryptoCredentialsDetails.cert = readFileSync(server.config.sslCertFile);
      }

      if (server.config.sslKeyFile) {
        options.cryptoCredentialsDetails.key = readFileSync(server.config.sslKeyFile);
      }


      if (server.config.sslCaFile && server.config.sslCertFile && server.config.sslKeyFile) {
        // trust = !reject
        // mssql driver reverses this setting for no obvious reason
        // other drivers simply pass through to the SSL library.
        options.trustServerCertificate = !server.config.sslRejectUnauthorized
      }

      config.options = options;
    }

    // Set last: both branches above assign config.options wholesale.
    if (browserLookupInstance) {
      config.options.instanceName = browserLookupInstance;
    }

    return config;
  }
}
