import { BeeCursor, TableColumn } from "@/lib/db/models";
import { HanaConn } from "./HanaPool";
import { promisify } from "util";
import rawLog from '@bksLogger';

const log = rawLog.scope('HanaCursor');

// Streams rows from a single server-side result set: the query executes once
// via a prepared statement and rows are pulled incrementally with
// ResultSet.next()/getValues(), so every chunk comes from the same snapshot
// and nothing is re-scanned between chunks.
export class HanaCursor extends BeeCursor {
  private conn: HanaConn;
  private statement: any;
  private resultSet: any;

  constructor(
    conn: HanaConn,
    private query: string,
    chunkSize: number,
  ) {
    super(chunkSize);
    this.conn = conn;
  }

  get columns(): TableColumn[] | null {
    if (!this.resultSet) return null;
    return this.resultSet.getColumnInfo().map((column) => ({
      columnName: column.columnName,
      dataType: column.typeName,
    }));
  }

  async start(): Promise<void> {
    log.info('Starting cursor');
    this.statement = await this.conn.prepare(this.query);
    this.resultSet = await promisify(
      this.statement.execQuery.bind(this.statement)
    )();
  }

  async read(): Promise<any[][]> {
    const next = promisify(this.resultSet.next.bind(this.resultSet));
    const getValues = promisify(this.resultSet.getValues.bind(this.resultSet));

    const rows: any[][] = [];
    while (rows.length < this.chunkSize) {
      const hasRow: boolean = await next();
      if (!hasRow) break;
      rows.push(Object.values(await getValues()));
    }
    return rows;
  }

  async cancel(): Promise<void> {
    log.info('Closing cursor');
    try {
      if (this.resultSet && !this.resultSet.isClosed()) {
        await promisify(this.resultSet.close.bind(this.resultSet))();
      }
    } catch (err) {
      log.warn('Error closing result set', err);
    }
    try {
      if (this.statement) {
        await promisify(this.statement.drop.bind(this.statement))();
      }
    } catch (err) {
      log.warn('Error dropping statement', err);
    }
    await this.conn.release();
  }
}
