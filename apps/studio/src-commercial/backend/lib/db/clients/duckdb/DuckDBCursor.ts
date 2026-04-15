import { BeeCursor } from "@/lib/db/models";
import rawLog from "@bksLogger";
import { DuckDBResult, DuckDBConnection } from "@duckdb/node-api";

const log = rawLog.scope("DuckDBCursor");

export class DuckDBCursor extends BeeCursor {
  private stream: DuckDBResult;
  private rowBuffer: any[][] = [];

  constructor(
    private connection: DuckDBConnection,
    private query: string,
    chunkSize: number
  ) {

    super(chunkSize);
  }

  async start() {
    log.info("Starting cursor");
    this.stream = await this.connection.stream(this.query);
  }

  async read(): Promise<any[][]> {
    // We can't set the chunk size for duckdb, so we just buffer it
    if (this.rowBuffer.length < this.chunkSize) {
      const chunk = await this.stream.fetchChunk();
      this.rowBuffer.push(...chunk.getRows());
    }

    return this.rowBuffer.splice(0, this.chunkSize);
  }

  async cancel() {
    log.info("canceling cursor");
    // do nothing
    this.stream = null;
  }
}
