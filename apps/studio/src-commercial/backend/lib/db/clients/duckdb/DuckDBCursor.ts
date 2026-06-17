import { BeeCursor } from "@/lib/db/clients/models";
import { TableColumn } from "@/lib/db/models";
import rawLog from "@bksLogger";
import { DuckDBResult, DuckDBConnection } from "@duckdb/node-api";

const log = rawLog.scope("DuckDBCursor");

export class DuckDBCursor extends BeeCursor {
  private stream: DuckDBResult;
  private rowBuffer: any[][] = [];
  private fields: string[];

  constructor(
    private connection: DuckDBConnection,
    private query: string,
    chunkSize: number
  ) {

    super(chunkSize);
  }

  get columns(): TableColumn[] | null {
    if (!this.fields) return null;
    return this.fields.map((f, i) => ({
      columnName: f,
      dataType: this.stream.columnType(i).toString()
    }))
  }

  async start() {
    log.info("Starting cursor");
    this.stream = await this.connection.stream(this.query);
    this.fields = this.stream.columnNames();
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
