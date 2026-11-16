import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { IDbConnectionDatabase } from "@/lib/db/types";
import connectTunnel from "@/lib/db/tunnel";
import rawLog from "@bksLogger";
import events from "events";

const log = rawLog.scope("BasicDatabaseClient");
const logger = () => log;

export type ConnectionPoolOptions = {
  server: IDbConnectionServer;
  database: IDbConnectionDatabase;
};

export type ConnectOptions = {
  signal?: AbortSignal;
};

export class DatabaseConnectionLostError extends Error {
  declare cause: Error;

  constructor(cause: Error) {
    super("Database connection lost", { cause });
    this.name = "DatabaseConnectionLostError";
  }
}

/**
 * `DatabaseConnector` acts a bridge between the app and a database driver (mysql2, pg, etc..).
 *
 * Its main purpose is to handle low-level usage of the database driver that includes;
 * configuration, connection pooling, error handling, ssh tunnels, etc..
 **/
export abstract class DatabaseConnector<
  RawConnection = any,
  GetRawConnectionOptions = any
> extends events.EventEmitter<{ "connection-lost": [] }> {
  private connected: boolean = false;

  protected readonly server: IDbConnectionServer;
  protected readonly database: IDbConnectionDatabase;

  constructor(options: ConnectionPoolOptions) {
    super();
    this.server = options.server;
    this.database = options.database;
    this.handleError = this.handleError.bind(this);
  }

  protected abstract doConnect(options: ConnectOptions): Promise<void>;

  protected abstract doDisconnect(): Promise<void>;

  protected abstract doGetClient(
    options?: GetRawConnectionOptions
  ): Promise<RawConnection>;

  protected abstract isConnectionLostError(err: any): boolean;

  get isConnected() {
    return this.connected;
  }

  async connect(options: ConnectOptions = {}) {
    if (this.connected) {
      log.warn("already connected. please disconnect first to reconnect");
      return;
    }

    // reuse existing tunnel
    if (this.server.config.ssh && !this.server.sshTunnel) {
      logger().debug("creating ssh tunnel");
      this.server.sshTunnel = await connectTunnel(this.server.config);

      this.server.config.localHost = this.server.sshTunnel.localHost;
      this.server.config.localPort = this.server.sshTunnel.localPort;
    }

    await this.doConnect(options);

    this.connected = true;
  }

  async disconnect() {
    await this.doDisconnect();

    if (this.server.sshTunnel) {
      await this.server.sshTunnel.connection.shutdown();
      this.server.sshTunnel = null;
    }

    this.connected = false;
  }

  async getRawConnection(
    options?: GetRawConnectionOptions
  ): Promise<RawConnection> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      return await this.doGetClient(options);
    } catch (err) {
      throw this.handleError(err);
    }
  }

  protected handleError(err: any): Error {
    if (this.isConnectionLostError(err)) {
      this.emit("connection-lost");
      return new DatabaseConnectionLostError(err);
    }
    return err;
  }
}

export class NoopConnector extends DatabaseConnector<null, void> {
  protected async doConnect(): Promise<void> { }
  protected async doDisconnect(): Promise<void> { }
  protected async doGetClient(): Promise<null> {
    return null;
  }
  protected isConnectionLostError(): boolean {
    return false;
  }
}
