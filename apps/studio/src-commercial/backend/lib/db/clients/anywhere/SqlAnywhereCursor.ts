import { BeeCursor, OrderBy, TableFilter } from "@/lib/db/models";
import { SqlAnywhereConn } from "./SqlAnywherePool";
import rawLog from '@bksLogger';
import { SQLAnywhereClient } from "../anywhere";

const log = rawLog.scope('SqlAnywhereCursor');

interface SqlAnywhereCursorOptions {
  schema?: string;
  table: string;
  orderBy: OrderBy[];
  filters: string | TableFilter[];
  chunkSize: number;
}

export class SqlAnywhereCursor extends BeeCursor {
  private cursorPos: number = 0;
  private conn: SqlAnywhereConn;
  private client: SQLAnywhereClient;

  constructor(
    conn: SqlAnywhereConn,
    private options: SqlAnywhereCursorOptions,
    client: SQLAnywhereClient
  ) {
    super(options.chunkSize);
    this.conn = conn;
    this.client = client;
  }

  async start(): Promise<void> {
    log.info('Starting cursor');
    this.cursorPos = 0;
  }

  async read(): Promise<any[][]> {
    try {
      const offset = this.cursorPos * this.chunkSize;
      const limit = this.chunkSize;
      
      // Generate SQL for paginated query
      const sql = await this.client.selectTopSql(
        this.options.table,
        offset,
        limit,
        this.options.orderBy,
        this.options.filters,
        this.options.schema,
        ['*']
      );
      
      // Execute the query
      const result = await this.conn.query(sql);
      this.cursorPos++;
      
      // If no results, return empty array
      if (!result || result.length === 0) {
        return [];
      }
      
      // Convert rows to array format expected by BeeCursor
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
