import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { IDbConnectionDatabase } from "@/lib/db/types";
import connectTunnel from '@/lib/db/tunnel';
import rawLog from "@bksLogger";
import { ConnectionPool } from "@aws-sdk/types";

const log = rawLog.scope('BasicDatabaseClient');
const logger = () => log;

export type ConnectionPoolOptions = {
  server: IDbConnectionServer;
  database: IDbConnectionDatabase;
};

/**
 * A class that uniforms connection pool logic including the ssh tunnel.
 *
 * @example
 *
 * class PostgresConnectionPool extends GenericConnectionPool<pg.Client> {
 *   // implement abstract methods here
 * }
 *
 * const pool = new PostgresConnectionPool();
 * const client = await pool.connect(); // connect to the database. no need to call `.start()`.
 * await pool.end(); // close it manually when needed
 *
 **/
export abstract class GenericConnectionPool<ClientType> {
  private started: boolean = false;

  protected readonly server: IDbConnectionServer;
  protected readonly database: IDbConnectionDatabase;

  constructor(options: ConnectionPoolOptions) {
    this.server = options.server;
    this.database = options.database;
  }

  abstract doStart(): Promise<void>;

  abstract doEnd(): Promise<void>;

  abstract doConnect(): Promise<ClientType>;

  async start() {
    // reuse existing tunnel
    if (this.server.config.ssh && !this.server.sshTunnel) {
      logger().debug('creating ssh tunnel');
      this.server.sshTunnel = await connectTunnel(this.server.config);

      this.server.config.localHost = this.server.sshTunnel.localHost
      this.server.config.localPort = this.server.sshTunnel.localPort
    } else if (this.server.sshTunnel){
      logger().debug('reusing ssh tunnel');
      await this.server.sshTunnel.reconnect();
    }

    await this.doStart();

    this.started = true;
  }

  async end() {
    await this.doEnd();

    if (this.server.sshTunnel) {
      await this.server.sshTunnel.connection.shutdown();
      this.server.sshTunnel = null;
    }

    this.started = false;
  }

  async connect(): Promise<ClientType> {
    if (!this.started) {
      await this.start();
    }

    return await this.doConnect();
  }

  protected async onConnectionTerminatedUnexpectedly() {
    log.info('Connection lost, rebuilding pool and SSH tunnel for reconnection');
    await this.end();
  }
}
