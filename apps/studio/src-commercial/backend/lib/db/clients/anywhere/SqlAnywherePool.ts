import sqlanywhere from 'sqlanywhere';
import { promisify } from 'util';
import rawLog from '@bksLogger';
import _ from 'lodash';

const log = rawLog.scope('SqlAnywherePool');

export class SqlAnywhereConn {
  config: any;
  rawConnection: any;
  pool: SqlAnywherePool;
  connectionId: number;

  constructor(config, pool: SqlAnywherePool) {
    this.config = config;
    this.rawConnection = sqlanywhere.createConnection();
    this.pool = pool;
  }

  async connect() {
    await promisify(
      this.rawConnection.connect.bind(this.rawConnection)
    )(this.config);
    const id = await this.query(`SELECT CONNECTION_PROPERTY('Number') AS id`);
    if (id && _.isArray(id)) {
      this.connectionId = id[0]?.id;
    }
  }

  async disconnect() {
    return await promisify(
      this.rawConnection.disconnect.bind(this.rawConnection)
    )();
  }

  async release() {
    await this.pool.release(this);
  }

  async drop() {
    await this.pool.release(this);
    await this.pool.remove(this);
  }

  async query(query: string, autoCommit = true) {
    const results = await promisify(
      this.rawConnection.exec.bind(this.rawConnection)
    )(query);
    if (autoCommit) {
      await promisify(
        this.rawConnection.commit.bind(this.rawConnection)
      )();
    }
    return results;
  }

  async commit() {
    return await promisify(
      this.rawConnection.commit.bind(this.rawConnection)
    )();
  }

  async rollback() {
    return await promisify(
      this.rawConnection.commit.bind(this.rawConnection)
    )();
  }
}

export class SqlAnywherePool {
  config: any;
  maxSize: number;
  pool: SqlAnywhereConn[] = [];
  inUse: Set<SqlAnywhereConn> = new Set();

  constructor(config, maxSize = 8) {
    this.config = config;
    this.maxSize = maxSize;
  }

  async connect(): Promise<SqlAnywhereConn> {
    // try to reuse an available connection
    for (const p of this.pool) {
      if (!this.inUse.has(p)) {
        log.info('Reusing connection', p.connectionId);
        this.inUse.add(p);
        return p;
      }
    }

    // create new connection if under max
    if (this.pool.length < this.maxSize) {
      const pConn = new SqlAnywhereConn(this.config, this);
      await pConn.connect();
      log.info('Acquiring new connection', pConn.connectionId);
      this.pool.push(pConn);
      this.inUse.add(pConn);
      return pConn;
    }

    // wait for a connection to be released
    return new Promise((resolve) => {
      log.info('Waiting for new connection to be available')
      const interval = setInterval(() => {
        for (const p of this.pool) {
          if (!this.inUse.has(p)) {
            log.info('Reusing connection', p.connectionId);
            this.inUse.add(p);
            clearInterval(interval);
            resolve(p);
            return;
          }
        }
      }, 100);
    })
  }

  async remove(conn: SqlAnywhereConn) {
    const index = this.pool.indexOf(conn);
    if (index > -1) {
      this.pool.splice(index, 1);
    }
  }

  async release(conn: SqlAnywhereConn) {
    log.info('Releasing connection', conn.connectionId);
    this.inUse.delete(conn);
  }

  async disconnect() {
    for (const conn of this.pool) {
      await conn.disconnect();
    }
    this.pool = [];
    this.inUse.clear();
  }
}
