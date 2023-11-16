import { BeeCursor } from "../../models";
import Sqlite, { Database, Statement } from 'better-sqlite3'

export class SqliteCursor extends BeeCursor {

  private database: Database
  private statement: Statement
  private iterator?: IterableIterator<any>;

  constructor(
    databaseName: string,
    private query: string,
    private params: string[], chunkSize: number) {
    super(chunkSize);
    this.database = new Sqlite(databaseName)
    this.statement = this.database.prepare(this.query)
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
