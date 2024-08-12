import { BeeCursor, OrderBy, TableFilter } from "../../models"
import rawlog from 'electron-log'
import { ClickHouseClient as ClickHouse } from "../clickhouse"
import type { ClickHouseClient } from '@clickhouse/client'
import { uuidv4 } from "@/lib/uuid"
const log = rawlog.scope('clickhouse/cursor')


interface CursorOptions {
  table: string
  orderBy: OrderBy[]
  filters: string | TableFilter[]
  client: ClickHouseClient
  chunkSize: number
}

export class ClickHouseCursor extends BeeCursor {
  private readonly options: CursorOptions
  private cursorPos = 0;
  private client: ClickHouseClient;
  private queryId: string;

  constructor(options: CursorOptions) {
    super(options.chunkSize)
    this.options = options
    this.client = options.client
    this.queryId = uuidv4();
  }

  async start() {
    log.info("Starting cursor");
  }

  async read() {
    const offset = this.cursorPos * this.chunkSize;
    const limit = this.chunkSize;
    const query = ClickHouse.buildSelectTopQuery(
      this.options.table,
      offset,
      limit,
      this.options.orderBy,
      this.options.filters
    );
    const result = await this.client.query({
      query: query.query,
      query_params: query.params,
      query_id: this.queryId,
      format: 'JSONCompactEachRow',
    });
    this.cursorPos++;
    return await result.json() as any[][]
  }

  async cancel() {
    await this.client.command({
      query: `KILL QUERY WHERE query_id='${this.queryId}'`,
    })
  }

}
