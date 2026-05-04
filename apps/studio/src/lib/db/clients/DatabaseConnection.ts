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
 * A class that uniforms connection pool logic including the ssh tunnel.
 *
 * @example
 *
 * class PsqlConnection extends DatabaseConnection<pg.Client> {
 *   // implement abstract methods here
 * }
 *
 * const connection = new PsqlConnection();
 *
 * // Connect before using
 * await connection.connect();
 *
 * // Get a client
 * const client = await conn.getClient();
 *
 * // Disconnect if not used
 * await connection.disconnect();
 *
 * // Listen for connection lost event
 * connection.on("connection-lost", async () => {
 *   // If connection is lost, we need to initiate a new fresh connection.
 *
 *   // 1. Makes sure we shutdown the active connection and ssh tunnel properly
 *   await connection.disconnect();
 *
 *   // 2. Makes a new connection and ssh tunnel (if enabled)
 *   await connection.connect();
 * })
 *
 **/
export abstract class DatabaseConnection<
  Client,
  GetClientOptions = any
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

  protected abstract doGetClient(options?: GetClientOptions): Promise<Client>;

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
      this.server.sshTunnel = await connectTunnel(this.server.config, options.signal);

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

  async getClient(options?: GetClientOptions): Promise<Client> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      return await this.doGetClient(options);
    } catch (err) {
      await this.handleErrorAndRethrow(err);
    }
  }

  protected async handleError(err: any) {
    if (this.isConnectionLostError(err)) {
      this.emit("connection-lost");
    }
  }

  private async handleErrorAndRethrow(err: any) {
    await this.handleError(err);

    if (this.isConnectionLostError(err)) {
      throw new DatabaseConnectionLostError(err);
    }

    throw err;
  }
}

export class NoopConnection extends DatabaseConnection<null, void> {
  protected async doConnect(): Promise<void> { }
  protected async doDisconnect(): Promise<void> { }
  protected async doGetClient(): Promise<null> {
    return null;
  }
  protected isConnectionLostError(): boolean {
    return false;
  }
}
