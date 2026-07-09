import { BeeCursor, OrderBy, TableColumn, TableFilter } from "@/lib/db/models";
import { HanaConn } from "./HanaPool";
import rawLog from '@bksLogger';
import { HanaClient } from "../hana";

const log = rawLog.scope('HanaCursor');

interface HanaCursorOptions {
  schema?: string;
  table: string;
  orderBy: OrderBy[];
  filters: string | TableFilter[];
  chunkSize: number;
}

export class HanaCursor extends BeeCursor {
  private cursorPos = 0;
  private conn: HanaConn;
  private client: HanaClient;

  constructor(
    conn: HanaConn,
    private options: HanaCursorOptions,
    client: HanaClient
  ) {
    super(options.chunkSize);
    this.conn = conn;
    this.client = client;
  }

  // We don't support query streaming so we don't need the columns getter
  get columns(): TableColumn[] | null {
    return null;
  }

  async start(): Promise<void> {
    log.info('Starting cursor');
    this.cursorPos = 0;
  }

  async read(): Promise<any[][]> {
    try {
      const offset = this.cursorPos * this.chunkSize;
      const limit = this.chunkSize;

      const sql = await this.client.selectTopSql(
        this.options.table,
        offset,
        limit,
        this.options.orderBy,
        this.options.filters,
        this.options.schema,
        ['*']
      );

      const result = await this.conn.query(sql);
      this.cursorPos++;

      if (!result || !Array.isArray(result) || result.length === 0) {
        return [];
      }

      return result.map(row => Object.values(row));
    } catch (err) {
      log.error('Error reading data:', err);
      throw err;
    }
  }

  async cancel(): Promise<void> {
    log.info('Canceling cursor');
    // Nothing to do here as we're using individual queries
    // The connection will be released elsewhere
  }
}
