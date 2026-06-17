import mysql, { FieldPacket, OkPacket, RowDataPacket } from "mysql2/typings/mysql";
import Query from "mysql2/typings/mysql/lib/protocol/sequences/Query";
import { TableColumn } from "../../models";
import { waitFor } from "../base/wait";
import _ from "lodash";
import rawLog from '@bksLogger'
import { BeeCursor, CursorOptions } from "../models";
import { Readable } from "stream";

const log = rawLog.scope('mysqlcursor');

export class MysqlCursor extends BeeCursor {

  private cursor?: Query.Query;
  private rowBuffer: any[][] = [];
  private bufferReady = false;
  private end = false;
  private error?: Error;
  private fields: FieldPacket[];

  constructor(
    options: CursorOptions,
    private conn: mysql.PoolConnection,
  ) {
    super(options)
  }

  get columns(): TableColumn[] | null {
    if (!this.fields) return null;
    return this.fields.map((f) => ({
      columnName: f.name,
      dataType: f.typeName
    }))
  }

  async start(): Promise<void> {
    log.debug("start")
    const q = this.conn.query({ sql: this.options.query, values: this.options.params, rowsAsArray: true });
    if (!this.options.isStreaming) {
      q.on('result', this.handleRow.bind(this));
    }
    q.on('fields', this.handleFields.bind(this));
    q.on('end', this.handleEnd.bind(this));
    q.on('error', this.handleError.bind(this));
    this.cursor = q;
  }

  stream(): Readable {
    return this.cursor.stream({
      objectMode: true,
      highWaterMark: this.chunkSize * 2
    });
  }

  private handleFields(fields: FieldPacket[]) {
    if (fields && _.isArray(fields)) {
      this.fields = fields;
    }
  }

  private handleRow(row: RowDataPacket | OkPacket) {
    if ("fieldCount" in row) return;
    this.rowBuffer.push(row as any[])
    if (this.rowBuffer.length >= this.chunkSize) {
      this.conn.pause()
      this.bufferReady = true
    }
  }

  private handleEnd(){
    log.debug("handling end")
    this.end = true
    if (this.manageConnection) {
      this.conn?.destroy();
    }
  }

  private handleError(error: Error) {
    log.debug("handling error")
    this.error = error
    console.error(error)
  }

  private pop() {
    const result = this.rowBuffer
    this.rowBuffer = []
    return result
  }

  private resume() {
    this.bufferReady = false
    this.conn?.resume();
  }

  async read(): Promise<any[][]> {
    await waitFor(() => this.bufferReady || this.end || !!this.error)
    if (this.error) throw this.error
    if (this.end) return this.pop()
    const results = this.pop()
    this.resume()
    return results
  }

  async cancel(): Promise<void> {
    log.debug('cursor cancelled')
    if (this.manageConnection) {
      this.conn?.destroy();
    }
  }

}
