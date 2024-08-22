import { BeeCursor } from "../../models";
import rawlog from "electron-log";
import type { ClickHouseClient, Row, StreamReadable } from "@clickhouse/client";
import { uuidv4 } from "@/lib/uuid";

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
  private rows: any[][] = [];

  constructor(options: CursorOptions) {
    super(options.chunkSize);
    this.options = options;
    this.client = options.client;
    this.queryId = uuidv4();
  }

  async start(): Promise<void> {
    log.info("Starting cursor");

    const result = await this.client.query({
      query: this.options.query,
      query_params: this.options.params,
      query_id: this.queryId,
      format: "JSONCompactEachRow",
    });

    this.stream = result.stream();

    return new Promise((resolve, reject) => {
      this.stream.on("data", (rows) => {
        rows.forEach((row) => {
          this.rows.push(row.json());
        });
      });
      this.stream.on("end", () => {
        resolve();
      });
      this.stream.on("error", (err) => {
        reject(err);
      });
    });
  }

  async read() {
    return this.rows.splice(0, this.chunkSize);
  }

  async cancel() {
    log.info("Canceling cursor");
    await this.client.command({
      query: `KILL QUERY WHERE query_id='${this.queryId}'`,
    });
  }
}
