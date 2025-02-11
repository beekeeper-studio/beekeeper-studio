import { BeeCursor } from "@/lib/db/models";
import oracle from 'oracledb'
import rawLog from '@bksLogger'
import { waitFor } from "@/lib/db/clients/base/wait";

const log = rawLog.scope("oracle:cursor")

export class OracleCursor extends BeeCursor {

  private conn: oracle.Connection
  private stream: oracle.QueryStream<any>
  private rowBuffer: any[] = []
  private bufferReady = false
  private end = false
  private error?: Error

  constructor(
    private pool: oracle.Pool,
    private query: string,
    private params: string[],
    chunkSize: number
    ) {
      super(chunkSize)

  }

  async start(): Promise<void> {
    this.conn = await this.pool.getConnection()
    log.info("Oracle cursor start", this.query, this.params)
    this.stream = this.conn.queryStream(this.query, this.params)
    this.stream.on('error', this.handleError.bind(this))
    this.stream.on('end', this.handleEnd.bind(this))
    this.stream.on('metadata', this.handleMetadata.bind(this))
    this.stream.on('data', this.handleRow.bind(this))
    this.stream.on('close', this.handleClose.bind(this))
  }
  async read(): Promise<any[][]> {
    await waitFor(() => this.bufferReady || this.end || !!this.error)

    if (this.error) throw this.error
    if (this.end) return this.pop()
    const result = this.pop()
    this.resume()
    return result
  }
  async cancel(): Promise<void> {
    log.debug('cursor cancelled')
    await this.closeEverything()
  }

  private handleRow(row: any) {

    this.rowBuffer.push(row)
    if (this.rowBuffer.length >= this.chunkSize) {
      this.stream.pause()
      this.bufferReady = true
    }
  }

  private handleMetadata(data: any) {
    console.log('handling metadata', data)
  }

  private async handleEnd() {
    log.debug("oracle stream handling end")
    await this.closeEverything()
    this.end = true
  }

  private async handleClose() {
    try {
      await this.conn.release()
    } catch {
      // do nothing
    }
  }

  private handleError(error: Error) {
    log.debug("oracle stream error", error)
    this.error = error
    console.error("oracle stream error", error)
  }

  private pop() {
    const result = this.rowBuffer
    this.rowBuffer = []
    return result
  }

  private resume() {
    this.bufferReady = false
    this.stream.resume()
  }

  private async closeEverything() {
    try {
      this.stream.destroy()
      await this.conn.release()
    } catch {
      // do nothing
    }
  }

}
