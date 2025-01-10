import Firebird from "node-firebird";
import _ from "lodash";

export interface Result {
  rows: any[];
  meta: any[];
  isSelect: boolean;
}

export class Pool {
  private pool: Firebird.ConnectionPool;

  constructor(config: Firebird.Options) {
    this.pool = Firebird.pool(5, config);
  }

  async query(
    query: string,
    params?: any[],
    rowAsArray?: boolean
  ): Promise<Result> {
    if (typeof query !== "string") {
      // Do it here cause node-firebird would throw an error that can't be caught
      // in beekeeper.
      throw new Error("Invalid query. Query must be a string.");
    }

    const connection = await this.getConnection();
    const result = await connection.query(query, params, rowAsArray);
    connection.release();
    return result;
  }

  /** To use this, you need to release manually. */
  getConnection(): Promise<Connection> {
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

  static attach(options: Firebird.Options): Promise<Connection> {
    return new Promise((resolve, reject) => {
      Firebird.attach(options, (err, db) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(new Connection(db));
      })
    })
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
    return new Promise(async (resolve, reject) => {
      const database = this.database;
      // Firebird requires a transaction to parse blob columns, so we create it here so we use the
      // same transaction for every cell that needs to be parsed.
      const transaction: Firebird.Transaction = await new Promise((resolve, reject) => {
        this.database.transaction(Firebird.ISOLATION_READ_COMMITTED, (err, transaction) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(transaction)
        })
      });

      function callback(
        err: any,
        result: any[],
        meta: any[],
        isSelect: boolean
      ) {
        if (err) {
          reject(err);
          return;
        }

        if (!result) result = [];
        if (!meta) meta = [];
        if (!Array.isArray(result)) result = [result];
        const arrBlob = []
        // for blob columns
        result.map((value) => {
          Object.keys(value).map((c) => {
            if (_.isFunction(value[c])) {
              // create a promise for every blob and run the parsing function
              value[c] = new Promise((resBlob, rejBlob) => {
                value[c](transaction, (error, name, event, row) => {
                  if (error) {
                    return rejBlob(error);
                  }

                  // reading data
                  const chunks: Buffer[] = []
                  event.on('data', (chunk: Buffer) => chunks.push(chunk));
                  event.on('end', () => {
                    // TODO find how many bytes to read to get faster
                    resBlob({ value: Buffer.concat(chunks), column: name, row });
                  });
                });
              });
              arrBlob.push(value[c])
            }
          })
        })

        if (arrBlob.length > 0) {
          // wait for the promises to resolve, and then resolve the main promise
          // returned from this function
          Promise.all(arrBlob)
            .then((blobs) => {
              for (const blob of blobs) {
                result[blob.row][blob.column] = blob.value;
              }


              transaction.commit((err) => {
                if (err) {
                  return reject(err)
                }
                resolve({ rows: result, meta, isSelect });
              });
            })
        } else {
          // we still need to commit, even if we haven't used the transaction
          // as that's the only way to get rid of the reference to it.
          transaction.commit();
          resolve({ rows: result, meta, isSelect });
        }
      }

      try {
        if (rowAsArray) {
          /* eslint-disable-next-line */
          // @ts-ignore
          database.execute(query, params, callback);
        } else {
          /* eslint-disable-next-line */
          // @ts-ignore
          database.query(query, params, callback);
        }
      } catch (e) {
        reject(e?.message ?? e);
      }
    });
  }

  transaction(
    isolation: Firebird.Isolation = Firebird.ISOLATION_READ_COMMITTED
  ): Promise<Transaction> {
    return new Promise((resolve, reject) => {
      this.database.transaction(isolation, (err, transaction) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(new Transaction(transaction));
      });
    });
  }
}

export class Transaction {
  constructor(private transaction: Firebird.Transaction) {}

  query(query: string, params?: any[], rowAsArray?: boolean): Promise<Result> {
    return new Promise(async (resolve, reject) => {
      const transaction = this.transaction;

      function callback(
        err: any,
        result: any[],
        meta: any[],
        isSelect: boolean
      ) {
        if (err) {
          reject(err);
          return;
        }

        if (!result) result = [];
        if (!meta) meta = [];
        if (!Array.isArray(result)) result = [result];
        const arrBlob = [];
        // for blob columns
        result.map((value) => {
          Object.keys(value).map((c) => {
            if (_.isFunction(value[c])) {
              value[c] = new Promise((resBlob, rejBlob) => {
                value[c](transaction, (error, name, event, row) => {
                  if (error) {
                    return rejBlob(error);
                  }

                  // reading data
                  const chunks: Buffer[] = []
                  event.on('data', (chunk: Buffer) => chunks.push(chunk));
                  event.on('end', () => {
                    // TODO find how many bytes to read to get faster
                    resBlob({ value: Buffer.concat(chunks), column: name, row });
                  });
                });
              });
              arrBlob.push(value[c])
            }
          })
        })

        if (arrBlob.length > 0) {
          Promise.all(arrBlob)
            .then((blobs) => {
              for (const blob of blobs) {
                result[blob.row][blob.column] = blob.value;
              }

              resolve({ rows: result, meta, isSelect });
            })
        } else {
          resolve({ rows: result, meta, isSelect });
        }

      }

      try {
        if (rowAsArray) {
          /* eslint-disable-next-line */
          // @ts-ignore
          transaction.execute(query, params, callback);
        } else {
          /* eslint-disable-next-line */
          // @ts-ignore
          transaction.query(query, params, callback);
        }
      } catch (e) {
        reject(e?.message ?? e);
      }
    });
  }

  commit(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.transaction.commit((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  rollback(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.transaction.rollback((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    })
  }
}

export async function createDatabase(options: Firebird.Options) {
  return new Promise<void>((resolve, reject) => {
    Firebird.create(options, (err, db) => {
      if (err) {
        reject(err);
        return;
      }
      db.detach();
      resolve();
    })
  })
}
