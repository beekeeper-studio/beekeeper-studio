import { SqliteCursor } from "@/lib/db/clients/sqlite/SqliteCursor";
import Database from "libsql";

export interface LibSQLCursorOptions {
  isRemote?: boolean
  authToken?: string
}

export class LibSQLCursor extends SqliteCursor {
  options: LibSQLCursorOptions

  constructor(
    database: string | Database.Database,
    query: string,
    params: string[],
    chunkSize: number,
    options: LibSQLCursorOptions = {}
  ) {
    // @ts-expect-error not fully typed
    super(database, query, params, chunkSize, options);
  }

  protected _createConnection(path: string) {
    // @ts-expect-error not fully typed
    this.database = new Database(path, {
      // @ts-expect-error not fully typed
      authToken: this.options.authToken,
    });
  }

  // FIXME remove this method if resolved https://github.com/tursodatabase/libsql-js/issues/116
  protected _prepareStatement(query: string) {
    this.statement = this.database.prepare(query);
    if (!this.options.isRemote) {
      this.statement.raw(true);
    }
  }

  // FIXME remove this when we can fully use statement.raw
  async read(): Promise<any[][]> {
    if (this.options.isRemote) {
      return await this.readResultsAsObjects();
    }
    return await super.read();
  }

  private async readResultsAsObjects(): Promise<any[][]> {
    const results = [];
    for (let index = 0; index < this.chunkSize; index++) {
      const r: Record<string, any> = this.iterator?.next().value;
      if (r) {
        results.push(Object.entries(r).map(([, value]) => value));
      } else {
        break;
      }
    }
    return results;
  }

  async cancel(): Promise<void> {
    // FIXME this is a hack to empty the iterator. A better way to do a clean
    // up is by calling this.iterator.return() but LibSQL doesn't support this
    // yet.
    for (const _row of this.iterator) {}

    if(!this.usingExternalConnection) {
      this.database.close()
    }
  }
}
