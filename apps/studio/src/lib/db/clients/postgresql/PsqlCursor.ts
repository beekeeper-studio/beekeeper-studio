import { FieldDef, PoolClient } from "pg"
import Cursor from "pg-cursor"
import { TableColumn } from "../../models"
import rawlog from '@bksLogger'
import { Readable } from "stream"
import _ from "lodash"
import { BeeCursor, CursorOptions } from "../models"
const log = rawlog.scope('postgresql/cursor')


export class PsqlCursor extends BeeCursor {
  private cursor?: Cursor<any[]>
  private error?: Error
  private fields?: FieldDef[];

  constructor(options: CursorOptions, private client: PoolClient, private dataTypes: any) {
    super(options)
  }

  private handleError(error: Error) {
    this.error = error
  }

  get columns(): TableColumn[] | null {
    if (!this.fields) return null;
    return this.fields.map((f) => ({
      columnName: f.name,
      dataType: this.dataTypes[f.dataTypeID] || 'user-defined'
    }))
  }

  async start() {
    this.client.on('error', this.handleError.bind(this))
    const { query, params } = this.options
    this.cursor = this.client.query(new Cursor(query, params, {rowMode: 'array'}))
  }

  stream(): Readable {
    const cursor = this;
    return new Readable({
      objectMode: true,
      highWaterMark: this.chunkSize * 2,
      async read() {
        try {
          if (!cursor.client || !cursor.cursor) await cursor.start();
          const rows = await cursor.read();
          if (rows.length === 0) {
            this.push(null);
            return;
          }
          for (const row of rows) this.push(row);
        } catch (err) {
          this.destroy(err as Error);
        }
      },
      destroy(err, cb) {
        return cursor.cancel().then(() => cb(err)).catch(cb);
      }
    })
  }

  read(): Promise<any[][]> {
    return new Promise((resolve, reject) => {
      if (this.error) return reject(this.error)
      if (!this.client || !this.cursor) {
        reject("You need to call start first")
      } else {
        this.cursor.read(this.chunkSize, (err, rows, result) => {
          if (err) {
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
      if (this.cursor) {
        this.cursor.close((err) => {
          if (err) {
            if (this.manageConnection) {
              this.client?.release()
            }
            reject(err.message)
          } else {
            try {
              if (this.manageConnection) {
                this.client?.release()
              }
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
