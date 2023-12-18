import Firebird from "node-firebird";

interface Result {
  result: any[];
  meta: any[];
  isSelect: boolean;
}

export class Pool {
  private pool: Firebird.ConnectionPool;

  constructor(config: Firebird.Options) {
    this.pool = Firebird.pool(5, config);
  }

  query(query: string, params?: any[], rowAsArray?: boolean): Promise<Result> {
    return new Promise((resolve, reject) => {
      if (typeof query !== "string") {
        reject(new Error("Invalid query. Query must be a string."));
        return;
      }

      this.pool.get((err, database) => {
        if (err) {
          reject(err);
          return;
        }

        function callback(
          err: any,
          result: any[],
          meta: any[],
          isSelect: boolean
        ) {
          database.detach();
          if (err) {
            reject(err);
          } else {
            resolve({ result, meta, isSelect });
          }
        }

        if (rowAsArray) {
          /* eslint-disable-next-line */
          // @ts-ignore
          database.execute(query, params, callback);
        } else {
          /* eslint-disable-next-line */
          // @ts-ignore
          database.query(query, params, callback);
        }
      });
    });
  }

  /**
   * To use this, you need to release manually.
   * E.g.
   * const connection = await pool.acquire();
   * await connection.query("SELECT 1");
   * connection.release();
   **/
  acquire(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      let connection: Connection | undefined;
      try {
        this.pool.get((err, database) => {
          if (err) {
            reject(err);
            return;
          }
          connection = new Connection(database);
          resolve(connection);
        });
      } catch (err) {
        connection.release();
        reject(err);
      }
    });
  }

  destroy() {
    this.pool.destroy();
  }
}

export class Connection {
  constructor(private database: Firebird.Database) {}

  get() {
    return this.database;
  }

  release(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database.detach((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  query(query: string, params?: any[], rowAsArray?: boolean): Promise<Result> {
    return new Promise((resolve, reject) => {
      if (typeof query !== "string") {
        reject(new Error("Invalid query. Query must be a string."));
        return;
      }

      const database = this.database;

      function callback(
        err: any,
        result: any[],
        meta: any[],
        isSelect: boolean
      ) {
        database.detach();
        if (err) {
          reject(err);
        } else {
          resolve({ result, meta, isSelect });
        }
      }

      if (rowAsArray) {
        /* eslint-disable-next-line */
        // @ts-ignore
        database.execute(query, params, callback);
      } else {
        /* eslint-disable-next-line */
        // @ts-ignore
        database.query(query, params, callback);
      }
    });
  }
}
