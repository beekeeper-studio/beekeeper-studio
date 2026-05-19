import { BeeCursor } from "@/lib/db/models";
import { Bind, Connection, Pool, RowStatement, SnowflakeError } from "snowflake-sdk";

interface CursorOptions {
  query: string,
  params: Bind[],
  pool: Pool<Connection>,
  chunkSize: number,
}

export class SnowflakeCursor extends BeeCursor {
  private readonly options: CursorOptions;
  private stmt: RowStatement;
  private error?: SnowflakeError;
  private cursorPos: number = 0;
  private rowBuffer: any[][] = [];
  private conn: Connection;

  constructor(options: CursorOptions) {
    // TODO (@day): chunksize :)
    super(options.chunkSize);
    this.options = options;
  }

  async start() {
    this.conn = await this.options.pool.acquire();
    return await new Promise<void>((resolve, reject) => {
      this.stmt = this.conn.execute({
        sqlText: this.options.query,
        binds: this.options.params,
        rowMode: 'array',
        streamResult: true,
        complete: (err, stmt) => {
          if (err) {
            reject(err.message);
          }

          this.stmt = stmt;
          resolve();
        }
      });
    })
  }

  async read(): Promise<any[][]> {
    return new Promise((resolve, reject) => {
      if (this.error) return reject(this.error.message);
      if (!this.stmt) {
        return reject("You need to call start first");
      }

      this.stmt.streamRows({
        start: this.cursorPos,
        end: this.cursorPos + this.chunkSize
      })
      .on('error', (err) => {
        reject(err);
      })
      .on('data', (row) =>{
        this.rowBuffer.push(row);
      })
      .on('end', () => {
        const result = this.rowBuffer;
        this.rowBuffer = [];
        resolve(result);
      })
    })
  }

  async cancel(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.stmt.cancel(() => {
        resolve();
      });
    });
    await this.options.pool.release(this.conn);
  }
}
