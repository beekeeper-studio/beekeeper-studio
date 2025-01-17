import { BeeCursor, OrderBy, TableFilter } from "@/lib/db/models";
import rawLog from "@bksLogger";
import { Connection } from "./NodeFirebirdWrapper";
import Firebird from "node-firebird";
import { FirebirdClient } from "../firebird";

const log = rawLog.scope("firebirdcursor");

interface FirebirdCursorOptions {
  config: Firebird.Options;
  table: string;
  orderBy: OrderBy[];
  filters: string | TableFilter[];
  chunkSize: number;
}

export class FirebirdCursor extends BeeCursor {
  private options: FirebirdCursorOptions;
  private connection: Connection;
  private cursorPos = 0;

  constructor(options: FirebirdCursorOptions) {
    super(options.chunkSize);
    this.init(options);
  }

  async init(options: FirebirdCursorOptions) {
    log.info("Initializing connection");

    this.connection = await Connection.attach(options.config);
    this.options = options;
    this.cursorPos = 0;
  }

  async start() {
    log.info("Starting cursor");
  }

  async read() {
    const offset = this.cursorPos * this.chunkSize;
    const limit = this.chunkSize;
    const query = FirebirdClient.buildSelectTopQuery(
      this.options.table,
      offset,
      limit,
      this.options.orderBy,
      this.options.filters
    );
    const result = await this.connection.query(query.query, query.params, true);
    this.cursorPos++;
    return result.rows;
  }

  async cancel() {
    await this.connection.release();
  }
}
