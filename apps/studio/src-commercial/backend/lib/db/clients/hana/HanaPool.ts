import hana from '@sap/hana-client';
import { promisify } from 'util';
import rawLog from '@bksLogger';
import _ from 'lodash';

const log = rawLog.scope('HanaPool');

export class HanaConn {
  config: any;
  rawConnection: any;
  pool: HanaPool;
  connectionId: string;

  constructor(config, pool: HanaPool) {
    this.config = config;
    this.rawConnection = hana.createConnection();
    this.pool = pool;
  }

  async connect() {
    await promisify(
      this.rawConnection.connect.bind(this.rawConnection)
    )(this.config);
    const id = await this.query(`SELECT CURRENT_CONNECTION AS "id" FROM DUMMY`);
    if (id && _.isArray(id)) {
      const connectionId = id[0]?.id?.toString();
      // interpolated into ALTER SYSTEM CANCEL WORK -- only accept a plain number
      if (/^\d+$/.test(connectionId)) {
        this.connectionId = connectionId;
      }
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

  // Prepares a statement for incremental fetching via Statement.execQuery()
  // -> ResultSet. Callers own the statement and must drop() it when done.
  async prepare(query: string) {
    return await promisify(
      this.rawConnection.prepare.bind(this.rawConnection)
    )(query);
  }

  setAutoCommit(autoCommit: boolean) {
    this.rawConnection.setAutoCommit(autoCommit);
  }

  // exec returns an array of row objects for SELECT, and the affected row
  // count (a number) for DML/DDL.
  async query(query: string, autoCommit = true) {
    this.setAutoCommit(autoCommit);
    return await promisify(
      this.rawConnection.exec.bind(this.rawConnection)
    )(query);
  }

  async commit() {
    return await promisify(
      this.rawConnection.commit.bind(this.rawConnection)
    )();
  }

  async rollback() {
    return await promisify(
      this.rawConnection.rollback.bind(this.rawConnection)
    )();
  }
}

export class HanaPool {
  config: any;
  maxSize: number;
  pool: HanaConn[] = [];
  inUse: Set<HanaConn> = new Set();

  constructor(config, maxSize = 8) {
    this.config = config;
    this.maxSize = maxSize;
  }

  async connect(): Promise<HanaConn> {
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
      const pConn = new HanaConn(this.config, this);
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

  // Cancel whatever is running on the given connection. Uses a dedicated
  // sibling connection (not from the pool -- the pool may be exhausted by the
  // very query being cancelled) to run ALTER SYSTEM CANCEL WORK; a user can
  // always cancel their own sessions. Falls back to force-disconnecting.
  async cancelConnection(conn: HanaConn) {
    try {
      if (!conn.connectionId) {
        throw new Error('No connection id captured for this session');
      }
      const sibling = new HanaConn(this.config, this);
      await sibling.connect();
      try {
        await sibling.query(`ALTER SYSTEM CANCEL WORK IN SESSION '${conn.connectionId}'`);
      } finally {
        await sibling.disconnect();
      }
    } catch (err) {
      log.warn('Could not cancel session, force disconnecting instead', err);
      try {
        await conn.disconnect();
      } finally {
        await conn.drop();
      }
    }
  }

  async remove(conn: HanaConn) {
    const index = this.pool.indexOf(conn);
    if (index > -1) {
      this.pool.splice(index, 1);
    }
  }

  async release(conn: HanaConn) {
    log.info('Releasing connection', conn.connectionId);
    this.inUse.delete(conn);
  }

  async disconnect() {
    for (const conn of this.pool) {
      try {
        await conn.disconnect();
      } catch (err) {
        log.warn('Error disconnecting pooled connection', err);
      }
    }
    this.pool = [];
    this.inUse.clear();
  }
}
