import { BeeCursor } from "@/lib/db/models";
import rawLog from '@bksLogger'
import { waitFor } from "@/lib/db/clients/base/wait"

const log = rawLog.scope('cassandra:cursor');

export class CassandraCursor extends BeeCursor {

  private rowBuffer: any[][] = [[]]
  private bufferReady = false;
  private end = false
  private error?: Error
  private stream: any

  constructor(
    private connection: any, // have to figure out what this one would be. Whatever cassandra says but their typescript docs a re lacking
    private query: string,
    private params: string[],
    chunkSize: number
  ) {
    super(chunkSize)

  }

  start(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const classThis = this
    return new Promise((resolve) => {
      log.debug("start")
      this.connection
        .stream(`${this.query};`, this.params, { prepare: true })
          // function added here because so many "this's" to keep track of
          .on('readable', function handleReadable() {
            classThis.stream = this
            let row
            while ( (row = this.read()) !== null ) {
              const keys = row['keys']()
              const rowData = keys.map(k => row[k])
              classThis.rowBuffer.push(rowData)
            }

            if (classThis.rowBuffer.length >= classThis.chunkSize) {
              this.pause()
              classThis.bufferReady = true
            }
          })
          .on('end', this.handleEnd.bind(this))
          .on('error', this.handleError.bind(this))
      resolve()
    })
  }

  private handleEnd(){
    log.debug("handling end")
    this.end = true
    this.stream.destroy()
  }

  private handleError(error: Error) {
    log.debug("handling error")
    this.error = error
    console.error(error)
    this.stream?.destroy()
  }

  private pop() {
    const result = this.rowBuffer.slice()
    this.rowBuffer = []
    return result
  }

  private resume() {
    this.bufferReady = false
    this.stream.resume()
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
    this.stream.destroy()
  }
}
