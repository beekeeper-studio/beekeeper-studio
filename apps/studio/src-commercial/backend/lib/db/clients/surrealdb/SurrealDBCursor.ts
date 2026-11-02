import { BeeCursor, TableColumn } from "@/lib/db/models";
import rawLog from '@bksLogger';
import { Frame, jsonify, Value } from "surrealdb";
import { SurrealConn, SurrealPool } from "./SurrealDBPool";

const log = rawLog.scope('surrealdb/cursor');

interface CursorOptions {
  query: string;
  conn: SurrealPool;
  chunkSize: number;
}

export class SurrealDBCursor extends BeeCursor {
  private readonly options: CursorOptions;
  private client?: SurrealConn;
  private iterator?: AsyncIterator<Frame<unknown, false>>;
  private _columns: TableColumn[] | null = null;
  private error?: Error;
  private done = false;

  constructor(options: CursorOptions) {
    super(options.chunkSize);
    this.options = options;
  }

  get columns(): TableColumn[] | null {
    return this._columns;
  }

  async start(): Promise<void> {
    this.client = await this.options.conn.connect();
    const query = this.client.query(this.options.query);
    this.iterator = query.stream<unknown>()[Symbol.asyncIterator]();
  }

  async read(): Promise<any[][]> {
    if (this.error) throw this.error;
    if (this.done || !this.iterator) return [];

    const rows: any[][] = [];
    try {
      while (rows.length < this.chunkSize) {
        const next = await this.iterator.next();
        if (next.done) {
          this.done = true;
          break;
        }
        const frame = next.value;
        if (frame.isValue()) {
          const value = frame.value;
          if (!this._columns) {
            this._columns = this.getColumns(value);
          }
          rows.push(this.toRow(value));
        } else if (frame.isError()) {
          frame.throw();
        }
      }
    } catch (err) {
      this.error = err as Error;
      throw err;
    }

    return rows;
  }

  async cancel(): Promise<void> {
    this.done = true;
    try {
      await this.iterator?.return?.();
    } catch (err) {
      log.warn('Error closing SurrealDB stream iterator', err);
    }
    try {
      await this.client?.release();
    } catch (err) {
      log.warn('Error releasing SurrealDB connection', err);
    }
    log.debug('SurrealDB cursor cancelled');
  }

  // A SurrealDB value (RecordId, DateTime, Uuid, ...) is an object too, but it
  // is a single cell, not a row: its data lives in private fields.
  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Value);
  }

  private getColumns(value: unknown): TableColumn[] {
    if (this.isRecord(value)) {
      return Object.keys(value).map((name) => ({
        columnName: name,
        dataType: 'unknown',
      }));
    }
    return [{ columnName: 'value', dataType: 'unknown' }];
  }

  // The exporters treat cells as plain data: CSV wrote a RecordId as JSON
  // (`"person:1"` with the quotes, then CSV-quoted again) and JSON wrote its
  // enumerable keys (`{}`). jsonify converts SurrealDB values, nested ones
  // included, to plain values: `person:1`, ISO datetimes, GeoJSON.
  private toRow(value: unknown): any[] {
    if (this.isRecord(value)) {
      return Object.values(value).map((v) => jsonify(v));
    }
    return [jsonify(value)];
  }
}
