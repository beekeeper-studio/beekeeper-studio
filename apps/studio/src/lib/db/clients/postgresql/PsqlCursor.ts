import { FieldDef, PoolClient } from "pg"
import Cursor from "pg-cursor"
import { BeeCursor, TableColumn } from "../../models"
import rawlog from '@bksLogger'
import { PsqlConnector } from "./PsqlConnector"
const log = rawlog.scope('postgresql/cursor')


interface CursorOptions {
  query: string,
  params: (string | string[])[],
  connector: PsqlConnector,
  chunkSize: number,
  dataTypes: any
}

export class PsqlCursor extends BeeCursor {

  private readonly options: CursorOptions
  private cursor?: Cursor<any[]>
  private client?: PoolClient
  private error?: Error
  private fields?: FieldDef[];

  constructor(options: CursorOptions) {
    super(options.chunkSize)
    this.options = options
  }


  private handleError(error: Error) {
    this.error = error
  }

  private readonly onClientError = this.handleError.bind(this)

  // Give the client back to the pool exactly once. After an error the
  // connection's state is unknown, so the pool destroys it instead of
  // handing it to the next query.
  private releaseClient(destroy: boolean) {
    const client = this.client
    if (!client) return
    this.client = undefined
    this.cursor = undefined
    client.off('error', this.onClientError)
    try {
      client.release(destroy)
    } catch (ex) {
      log.warn(ex.message)
    }
  }

  get columns(): TableColumn[] | null {
    if (!this.fields) return null;
    return this.fields.map((f) => ({
      columnName: f.name,
      dataType: this.options.dataTypes[f.dataTypeID] || 'user-defined'
    }))
  }

  async start() {
    this.client = await this.options.connector.getRawConnection()
    this.client.on('error', this.onClientError)
    const { query, params } = this.options
    this.cursor = this.client.query(new Cursor(query, params, {rowMode: 'array'}))
  }

  read(): Promise<any[][]> {

    return new Promise((resolve, reject) => {
      if (this.error) {
        this.releaseClient(true)
        return reject(this.error)
      }
      if (!this.client || !this.cursor) {
        reject("You need to call start first")
      } else {
        this.cursor.read(this.chunkSize, (err, rows, result) => {
          if (err) {
            this.releaseClient(true)
            reject(err.message)
          } else {
            if (!this.fields && result.fields) {
              this.fields = result.fields;
            }
            resolve(rows)
          }
        })
      }
    })
  }
  cancel(): Promise<void> {
    return new Promise((resolve, reject) => {
      const cursor = this.cursor
      if (!cursor) {
        this.releaseClient(false)
        return resolve()
      }
      cursor.close((err) => {
        this.releaseClient(!!err)
        if (err) {
          reject(err.message)
        } else {
          resolve()
        }
      })
    })
  }

}
