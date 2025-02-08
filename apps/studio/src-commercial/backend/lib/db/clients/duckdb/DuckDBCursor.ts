import { BeeCursor, OrderBy, TableFilter } from "@/lib/db/models";
import rawLog from "@bksLogger";
import { DuckDBClient } from "../duckdb";

const log = rawLog.scope("DuckDBCursor");

interface DuckDBCursorOptions {
  schema: string;
  table: string;
  orderBy: OrderBy[];
  filters: string | TableFilter[];
  chunkSize: number;
}

export class DuckDBCursor extends BeeCursor {
  private cursorPos: number;

  constructor(
    private client: DuckDBClient,
    private options: DuckDBCursorOptions
  ) {
    super(options.chunkSize);
  }

  async start() {
    log.info("Starting cursor");
    this.cursorPos = 0;
  }

  async read() {
    const offset = this.cursorPos * this.chunkSize;
    const limit = this.chunkSize;
    const result = await this.client.selectTop(
      this.options.table,
      offset,
      limit,
      this.options.orderBy,
      this.options.filters,
      this.options.schema
    );
    this.cursorPos++;

    return result.result.map((row) => Object.values(row));
  }

  async cancel() {
    log.info("canceling cursor");
    // do nothing
  }
}
