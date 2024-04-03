import { BeeCursor } from "../../models";
import { ConnectionPool, Request } from 'mssql';
import { waitFor } from "../base/wait";

interface Conn {
  dbConfig: any
}

export class SqlServerCursor extends BeeCursor {
  private connection: ConnectionPool | undefined
  private request: Request | undefined;
  private end = false;
  private bufferReady = false;
  private error: Error | undefined;
  private rowBuffer: any[] = [];


  constructor(
    private conn: Conn,
    private query: string,
    chunkSize: number
  ) {
    super(chunkSize)
  }

  async start(): Promise<void> {

    this.connection = await new ConnectionPool(this.conn.dbConfig).connect()
    
    const request = this.connection.request()
    this.request = request

    request.arrayRowMode = true
    request.stream = true

    request.on('recordset', this.handleRecordset.bind(this))
    request.on('row', this.handleRow.bind(this).bind(this))
    request.on('error', this.handleError.bind(this))
    request.on('done', this.handleEnd.bind(this))
    request.query(this.query);
  }

  private handleRecordset() {
    // TODO: implement
  }

  private handleEnd() {
    this.bufferReady = true
    this.end = true
    this.connection?.close()
  }

  private handleError(error: Error) {
    this.error = error
    console.error(error)
  }

  private handleRow(row: any) {
    this.rowBuffer.push(row)
    if (this.rowBuffer.length >= this.chunkSize) {
      this.request?.pause()
      this.bufferReady = true
    }
  }


  private pop() {
    const result = this.rowBuffer
    this.rowBuffer = []
    return result
  }

  private resume() {
    this.bufferReady = false
    this.request?.resume()
  }

  async read(): Promise<any[][]> {
    if (this.error) throw this.error
    if (this.end) return this.pop()
    await waitFor(() => this.bufferReady)
    const results = this.pop()
    this.resume()
    return results
  }

  async cancel(): Promise<void> {
    return this.connection?.close()
  }

}
