import Surreal, { AnyAuth, ConnectionStatus, ConnectOptions, Token } from "surrealdb";
import rawLog from "@bksLogger";
import { uuidv4 } from "@/lib/uuid";
import ws from "ws";
import BksConfig from "@/common/bksConfig";
import _ from "lodash"

// HACK (@day): this is so websockets can work in a node process (smh surreal)
// @ts-ignore
globalThis.WebSocket = ws;

const log = rawLog.scope('SurrealDBPool');

export class SurrealConn extends Surreal {
  id: string;
  pool: SurrealPool;

  constructor(pool: SurrealPool, enginesOverride?: ConstructorParameters<typeof Surreal>[0]) {
    super(enginesOverride);

    this.id = uuidv4();
    this.pool = pool;
  }

  async release() {
    this.pool.release(this);
  }
}

export class SurrealPool {
  config: ConnectOptions;
  database: { namespace?: string | null, database?: string | null }
  auth: AnyAuth;
  token: Token;
  connectionString: string;
  maxSize: number;
  pool: SurrealConn[] = [];
  inUse: Set<string> = new Set();

  constructor(url: string, config: ConnectOptions, maxSize = 8) {
    this.connectionString = url;

    this.database = _.pick(config, "namespace", "database");
    config = _.omit(config, "namespace", "database")
    if (typeof config.auth !== 'string') {
      this.auth = config.auth;
    } else {
      this.token = config.auth
    }
    config = _.omit(config, "auth")
    this.config = config;
    this.maxSize = maxSize;
  }

  async connect(): Promise<SurrealConn> {
    for (const p of this.pool) {
      if (!this.inUse.has(p.id)) {
        log.info('Reusing connection', p.id);
        this.inUse.add(p.id);
        return p;
      }
    }

    if (this.pool.length < this.maxSize) {
      const newConn = new SurrealConn(this);
      log.info('Acquiring new connection', newConn.id);
      log.info('CONFIG: ', this.config)
      await newConn.connect(this.connectionString, this.config);
      log.info("Connected")
      newConn.info
      await newConn.use(this.database);
      log.info("Used", this.database)
      if (this.auth) {
        log.info("Signing in", this.auth)
        await newConn.signin(this.auth);
      } else {
        log.info("Authenticating: ", this.token)
        await newConn.authenticate(this.token)
      }
      await newConn.ready;

      this.pool.push(newConn);
      this.inUse.add(newConn.id);
      return newConn;
    }

    return new Promise((resolve, reject) => {
      log.info('Waiting for new connection to be available');
      let timeout: NodeJS.Timeout;
      const interval = setInterval(() => {
        for (const p of this.pool) {
          if (!this.inUse.has(p.id)) {
            log.info('Reusing connection', p.id);
            this.inUse.add(p.id);
            clearInterval(interval);
            clearTimeout(timeout);
            resolve(p);
            return;
          }
        }
      }, 100);
      timeout = setTimeout(() => {
        clearInterval(interval);
        reject("Timed out waiting for new connection to be available from SurrealDBPool");
      }, BksConfig.db.surrealdb.connectionTimeout)
    })
  }

  async remove(conn: SurrealConn) {
    const index = this.pool.findIndex((c) => c.id === conn.id);
    if (index > -1) {
      // just in case so we don't leave a dangling connection
      if (conn.status != ConnectionStatus.Disconnected) {
        await conn.close();
      }
      this.pool.splice(index, 1)
    }
  }

  async release(conn: SurrealConn) {
    log.info('Releasing connection', conn.id);
    this.inUse.delete(conn.id);
  }

  async disconnect() {
    for (const conn of this.pool) {
      await conn.close();
    }
    this.pool = [];
    this.inUse.clear();
  }

}
