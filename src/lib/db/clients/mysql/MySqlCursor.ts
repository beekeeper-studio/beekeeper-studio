import { Pool } from "mysql2/typings/mysql";
import PoolConnection from "mysql2/typings/mysql/lib/PoolConnection";
import Query from "mysql2/typings/mysql/lib/protocol/sequences/Query";
import { BeeCursor } from "../../models";

interface Conn {
  pool: Pool
}

interface MiniCursor {
  q: Query,
  connection: PoolConnection
}

const wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

async function waitFor(conditional: () => boolean) {
  while (!conditional()) {
    await wait(10)
  }
  return
}

export class MysqlCursor extends BeeCursor {

  private cursor?: MiniCursor
  private rowBuffer: any[][] = []
  private bufferReady = false;
  private end = false
  private error?: Error
  constructor(
    private conn: Conn,
    private query: string,
    private params: string[],
    chunkSize: number
  ) {
    super(chunkSize)

  }

  start(): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
      this.conn.pool.getConnection((err, connection) => {
        if (err) reject(err)
        // @ts-ignore rowsAsArray not in typings yet
        const q = connection.query({ sql: this.query, values: this.params, rowsAsArray: true })
        q.on('result', this.handleRow.bind(this) )
        q.on('end', this.handleEnd.bind(this) )
        q.on('error', this.handleError.bind(this))
        this.cursor = { connection: connection, q: q}
        resolve()
      })
    })
    return promise
  }

  private handleRow(row: any) {
    this.rowBuffer.push(row)
    if (this.rowBuffer.length >= this.chunkSize) {
      this.cursor?.connection.pause()
      this.bufferReady = true
    }
  }

  private handleEnd(){
    this.bufferReady = true
    this.end = true
  }
  
  private handleError(error: Error) {
    this.error = error
  }

  private pop() {
    const result = this.rowBuffer
    this.rowBuffer = []
    return result
  }

  async read(): Promise<any[][]> {
    if (this.error) throw this.error
    if (this.end) return this.pop()
    await waitFor(() => this.bufferReady)
    const results = this.pop()
    this.cursor?.connection.resume()
    return results
  }

  async cancel(): Promise<void> {
    return this.cursor?.connection.release()
  }

}