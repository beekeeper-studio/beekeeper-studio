import { PoolClient } from "pg"
import Cursor from "pg-cursor"
import { BeeCursor } from "../../models"
import rawlog from 'electron-log'
import { HasPool } from './types'
const log = rawlog.scope('postgresql/cursor')


interface CursorOptions {
  query: string,
  params: string[],
  conn: HasPool,
  chunkSize: number
}

export class PsqlCursor extends BeeCursor {

  private readonly options: CursorOptions
  private cursor?: Cursor<any[]>
  private client?: PoolClient
  private error?: Error

  constructor(options: CursorOptions) {
    super(options.chunkSize)
    this.options = options
  }


  private handleError(error: Error) {
    this.error = error
  }


  async start() {
    this.client = await this.options.conn.pool.connect()
    this.client.on('error', this.handleError.bind(this))
    const { query, params } = this.options
    this.cursor = this.client.query(new Cursor(query, params, {rowMode: 'array'}))
  }

  read(): Promise<any[][]> {

    return new Promise((resolve, reject) => {
      if (this.error) return reject(this.error)
      if (!this.client || !this.cursor) {
        reject("You need to call start first")
      } else {
        this.cursor.read(this.chunkSize, (err, rows) => {
          if (err) {
            reject(err.message)
          } else {
            resolve(rows)
          }
        })
      }
    })
  }
  cancel(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.cursor) {
        this.cursor.close((err) => {
          if (err) {
            reject(err.message)
          } else {
            try {
              this.client?.release()
            
            } catch(ex) {
              log.warn(ex.message)
            }finally {
              resolve()
            }
          }
        })
      }
    })
  }

}