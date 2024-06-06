import { BeeCursor } from "../../models";
import Sqlite, { Database, Statement } from 'better-sqlite3'

export class SqliteCursor extends BeeCursor {

  protected database: Database
  protected statement: Statement
  protected iterator?: IterableIterator<any>;

  constructor(
    databaseName: string,
    query: string,
    private params: string[],
    chunkSize: number,
    protected options?: any
  ) {
    super(chunkSize);
    this._createConnection(databaseName);
    this._prepareStatement(query);
  }

  protected _createConnection(path: string) {
    this.database = new Sqlite(path)
  }

  protected _prepareStatement(query: string) {
    this.statement = this.database.prepare(query)
    this.statement.raw(true);
  }

  async start(): Promise<void> {
    this.iterator = this.statement.iterate(this.params)
  }
  async read(): Promise<any[][]> {
    const results = []
    for (let index = 0; index < this.chunkSize; index++) {
      const r: any[] = this.iterator?.next().value
      if (r) {
        results.push(r)
      } else {
        break;
      }
    }
    return results
  }
  async cancel(): Promise<void> {
    this.database.close()
  }

}
