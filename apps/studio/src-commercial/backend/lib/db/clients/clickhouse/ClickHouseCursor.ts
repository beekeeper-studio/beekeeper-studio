import { BeeCursor } from "@/lib/db/models";
import rawlog from "@bksLogger";
import type { ClickHouseClient, Row, StreamReadable } from "@clickhouse/client";
import { uuidv4 } from "@/lib/uuid";
import { waitFor } from "@/lib/db/clients/base/wait";

interface CursorOptions {
  query: string;
  params: Record<string, any>;
  client: ClickHouseClient;
  chunkSize: number;
}

const log = rawlog.scope("clickhouse/cursor");

export class ClickHouseCursor extends BeeCursor {
  private readonly options: CursorOptions;
  private client: ClickHouseClient;
  private queryId: string;
  private stream: StreamReadable<Row<unknown, "JSONCompactEachRow">[]>;
  private rowBuffer: any[][] = [];
  private end = false;
  private error?: Error;
  private bufferReady = false;

  constructor(options: CursorOptions) {
    super(options.chunkSize);
    this.options = options;
    this.client = options.client;
  }

  async start(): Promise<void> {
    log.info("Starting cursor");

    this.queryId = uuidv4();

    const result = await this.client.query({
      query: this.options.query,
      query_params: this.options.params,
      query_id: this.queryId,
      format: "JSONCompactEachRow",
    });

    this.stream = result.stream();

    this.stream.on("data", this.handleRows.bind(this));
    this.stream.on("end", this.handleEnd.bind(this));
    this.stream.on("error", this.handleError.bind(this));
  }

  private handleRows(rows: Row[]) {
    rows.forEach((row) => {
      this.rowBuffer.push(row.json());
      if (this.rowBuffer.length >= this.chunkSize) {
        this.stream.pause();
        this.bufferReady = true;
      }
    });
  }

  private handleEnd() {
    log.debug("handling end");
    this.end = true;
    this.stream.destroy();
  }

  private handleError(error: Error) {
    log.debug("handling error");
    this.error = error;
    console.error(error);
  }

  private pop() {
    if (this.rowBuffer.length <= this.chunkSize) {
      const result = this.rowBuffer;
      this.rowBuffer = [];
      return result;
    } else {
      const result = this.rowBuffer.splice(0, this.chunkSize);
      return result;
    }
  }

  private resume() {
    this.bufferReady = false;
    this.stream.resume();
  }

  async read() {
    await waitFor(() => this.bufferReady || this.end || !!this.error);
    if (this.error) throw this.error;
    if (this.end) return this.pop();
    const results = this.pop();
    this.resume();
    return results;
  }

  async cancel() {
    log.info("Canceling cursor");
    await this.client.command({
      query: `KILL QUERY WHERE query_id='${this.queryId}'`,
    });
    this.stream?.destroy();
  }
}
