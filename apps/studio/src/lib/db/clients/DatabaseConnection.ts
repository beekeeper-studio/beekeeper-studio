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
 * // Listen for connection lost
 * connection.on("connection-lost", async () => {
 *   // do something when connection is lost
 *   // e.g. prompt user to reconnect, and then call `connection.connect()`
 *   await connection.connect();
 * })
 *
 **/
export abstract class DatabaseConnection<CLIENT> extends events.EventEmitter<{
  "connection-lost": [];
  connected: [];
}> {
  private connected: boolean = false;

  protected readonly server: IDbConnectionServer;
  protected readonly database: IDbConnectionDatabase;

  constructor(options: ConnectionPoolOptions) {
    super();
    this.server = options.server;
    this.database = options.database;
  }

  protected abstract doConnect(options: ConnectOptions): Promise<void>;

  protected abstract doDisconnect(): Promise<void>;

  protected abstract doGetClient(): Promise<CLIENT>;

  protected abstract isConnectionLostError(err: any): boolean;

  get isConnected() {
    return this.connected;
  }

  async connect(options: ConnectOptions = {}) {
    if (this.connected) {
      log.warn("already connected");
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
    this.emit("connected");
  }

  async disconnect() {
    await this.doDisconnect();

    if (this.server.sshTunnel) {
      await this.server.sshTunnel.connection.shutdown();
      this.server.sshTunnel = null;
    }

    this.connected = false;
  }

  async getClient(): Promise<CLIENT> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      return await this.doGetClient();
    } catch (err) {
      await this.handleError(err);
    }
  }

  protected async handleError(err: any) {
    console.log("handleError", {
      isConnectionLostError: this.isConnectionLostError(err),
    });
    if (this.isConnectionLostError(err)) {
      console.log(1);
      await this.disconnect();
      console.log(2);
      this.emit("connection-lost");
      console.log(3);
      return;
    }
    console.log(4);

    throw err;
  }
}
