import { PoolClient } from "pg"
import Cursor from "pg-cursor"
import { BeeCursor } from "../../models"
import { Conn } from './types'
import rawlog from 'electron-log'

const log = rawlog.scope('postgresql/cursor')


interface CursorOptions {
  query: string,
  params: string[],
  runner: <T>(c: Conn, f: (p: PoolClient) => Promise<T>) => Promise<T>,
  conn: Conn
}

export class PsqlCursor extends BeeCursor {

  private readonly options: CursorOptions
  private cursor?: Cursor
  private client?: PoolClient

  constructor(options: CursorOptions) {
    super()
    this.options = options
  }


  async start() {
    const result = await this.options.runner(this.options.conn, async (c) => {
      const query = this.options.query
      const params = this.options.params
      return { cursor: c.query(new Cursor(query, params)), client: c}
    })
    this.client = result.client
    this.cursor = result.cursor
  }
  read(chunkSize: number): Promise<any[]> {

    return new Promise((resolve, reject) => {
      if (!this.client || !this.cursor) {
        reject("You need to call start first")
      } else {
        this.cursor.read(chunkSize, (err, rows) => {
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