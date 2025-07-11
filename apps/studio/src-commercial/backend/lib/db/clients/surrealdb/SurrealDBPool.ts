import Surreal, { ConnectionStatus, ConnectOptions } from "surrealdb";
import rawLog from "@bksLogger";
import { uuidv4 } from "@/lib/uuid";

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
  connectionString: string;
  maxSize: number;
  pool: SurrealConn[] = [];
  inUse: Set<string> = new Set();

  constructor(url: string, config: ConnectOptions, maxSize = 8) {
    this.connectionString = url;
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
      await newConn.connect(this.connectionString, this.config);
      await newConn.ready;

      this.pool.push(newConn);
      this.inUse.add(newConn.id);
      return newConn;
    }

    return new Promise((resolve) => {
      log.info('Waiting for new connection to be available');
      const interval = setInterval(() => {
        for (const p of this.pool) {
          if (!this.inUse.has(p.id)) {
            log.info('Reusing connection', p.id);
            this.inUse.add(p.id);
            clearInterval(interval);
            resolve(p);
            return;
          }
        }
      }, 100);
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
