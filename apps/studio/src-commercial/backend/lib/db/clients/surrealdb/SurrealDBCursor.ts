import { Surreal } from "surrealdb";
import { BeeCursor } from "@/lib/db/models";
import rawLog from '@bksLogger';

const log = rawLog.scope('surrealdb/cursor');

interface CursorOptions {
  query: string;
  conn: Surreal;
  chunkSize: number;
}

export class SurrealDBCursor extends BeeCursor {
  private readonly options: CursorOptions;
  private offset = 0;
  private hasMoreData = true;
  private error?: Error;

  constructor(options: CursorOptions) {
    super(options.chunkSize);
    this.options = options;
  }

  async start(): Promise<void> {
    // SurrealDB doesn't have native cursor support, so we'll simulate it
    // by tracking offset and using LIMIT/START clauses
    this.offset = 0;
    this.hasMoreData = true;
  }

  async read(): Promise<any[][]> {
    if (this.error) {
      throw this.error;
    }

    if (!this.hasMoreData) {
      return [];
    }

    try {
      // Modify the query to add LIMIT and START clauses
      const paginatedQuery = this.addPaginationToQuery(this.options.query, this.offset, this.chunkSize);
      
      const result = await this.options.conn.query(paginatedQuery);
      
      // Extract rows from the result
      const queryResult = result[0];
      const rows = Array.isArray(queryResult) ? queryResult : [queryResult];
      
      // Convert to array format (similar to other cursor implementations)
      const arrayRows: any[][] = rows.map(row => {
        if (typeof row === 'object' && row !== null) {
          return Object.values(row);
        }
        return [row];
      });

      // Update pagination state
      this.offset += arrayRows.length;
      this.hasMoreData = arrayRows.length === this.chunkSize;

      return arrayRows;
    } catch (error) {
      this.error = error as Error;
      throw error;
    }
  }

  async cancel(): Promise<void> {
    // SurrealDB doesn't have built-in query cancellation
    // We'll just mark as cancelled
    this.hasMoreData = false;
    log.debug('SurrealDB cursor cancelled');
  }

  private addPaginationToQuery(query: string, offset: number, limit: number): string {
    // Remove existing LIMIT and START clauses if they exist
    const cleanQuery = query.replace(/\s+LIMIT\s+\d+/gi, '').replace(/\s+START\s+\d+/gi, '');
    
    // Add our pagination
    let paginatedQuery = cleanQuery;
    if (limit > 0) {
      paginatedQuery += ` LIMIT ${limit}`;
      if (offset > 0) {
        paginatedQuery += ` START ${offset}`;
      }
    }
    
    return paginatedQuery;
  }
}