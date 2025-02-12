import _ from "lodash";
import rawLog from "@bksLogger";
import { SqliteClient, SqliteResult } from "@/lib/db/clients/sqlite";
import Client_Libsql from "@libsql/knex-libsql";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import Database from "libsql";
import { LibSQLCursor, LibSQLCursorOptions } from "./libsql/LibSQLCursor";
import { IDbConnectionDatabase } from "@/lib/db/types";
import { SqliteCursor } from "@/lib/db/clients/sqlite/SqliteCursor";
import { createSQLiteKnex } from "@/lib/db/clients/sqlite/utils";
import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { NgQueryResult, BksField } from "@/lib/db/models";
import { LibSQLBinaryTranscoder } from "@/lib/db/serialization/transcoders";

const log = rawLog.scope("libsql");
const knex = createSQLiteKnex(Client_Libsql);

/**
 * FIXME: This class doesn't support returning query data as arrays so
 * "select 1 as a, 2 as a" will be returned as [{a:2}]. There are three ways
 * to solve this:
 * 1. Fix this in libsql-js https://github.com/tursodatabase/libsql-js/issues/116
 * 2. Use @libsql/client instead of libsql-js, but this seems to require us
 *    to use node >= 18
 * 3. Treat the object like arrays. If we run the above query, we can get both
 *    values by doing row[0] and row[1].
 */
export class LibSQLClient extends SqliteClient {
  private isRemote: boolean;
  /** Use this connection only when we need to sync to remote database */
  // @ts-expect-error not fully typed
  _rawConnection: Database.Database;
  transcoders = [LibSQLBinaryTranscoder];

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(server, database);

    this.knex = knex;

    this.databasePath = this.databasePath?.trim().replace(/^file:/, "");

    if (!this.databasePath) {
      this.isRemote = false;
    } else {
      this.isRemote = /^libsql:|^http:|^https:|^ws:|^wss:/.test(
        this.databasePath
      );
    }

    // Syncing is only supported with local files. there'd be a weird panic
    // we're using other target, so better prevent it here.
    if (
      this.libsqlOptions.syncUrl &&
      /^:memory:$|libsql:|^http:|^https:|^ws:|^wss:/.test(this.databasePath)
    ) {
      throw new Error("Sync URL can only be used with local files");
    }
  }

  async connect(): Promise<void> {
    await BasicDatabaseClient.prototype.connect.call(this);

    if (this.libsqlOptions.syncUrl) {
      this._rawConnection = this.acquireConnection() as any;
      // TODO should we sync when we connect?
      // this.connection.sync();
    }

    log.debug("connected");
    const version = await this.driverExecuteSingle(
      "SELECT sqlite_version() as version"
    );

    this.version = version;
  }

  async disconnect(): Promise<void> {
    await BasicDatabaseClient.prototype.disconnect.call(this);
    if (this._rawConnection) {
      this._rawConnection.close();
    }
  }

  async truncateElementSql(elementName: string): Promise<string> {
    // FIXME libsql doesn't expose `vacuum` yet. We'll need to run vacuum after
    // delete according to SqliteClient.
    // See https://github.com/tursodatabase/libsql/issues/1415
    return `Delete from ${this.dialectData.wrapIdentifier(elementName)};`;
  }

  async syncDatabase() {
    if (this._rawConnection) {
      this._rawConnection.sync();
    }
  }

  // FIXME (azmi): we need this until array mode is fixed
  async executeQuery(queryText: string, options: any = {}): Promise<NgQueryResult[]> {
    const arrayMode: boolean = options.arrayMode;
    const result = await this.driverExecuteMultiple(queryText, options);

    return (result || []).map(({ rows: data, columns, statement, changes }) => {
      // Fallback in case the identifier could not reconize the command
      const isSelect = Array.isArray(data);
      let rows: any[];
      let fields: any[];

      if (isSelect && arrayMode) {
        rows = data.map((row: Record<string, any>) =>
          Object.keys(row).reduce((obj, key, idx) => {
            obj[`c${idx}`] = row[key];
            return obj
          }, {})
        );
        if (columns.length > 0) {
          fields = columns.map((column, idx) => ({
            id: `c${idx}`,
            name: column.name
          }))
        } else if (data.length > 0) {
          fields = Object.keys(data[0]).map((name, idx) => ({
            id: `c${idx}`,
            name,
          }));
        }
      } else {
        rows = data || [];
        fields = Object.keys(rows[0] || {}).map((name) => ({name, id: name }));
      }

      return {
        command: statement.type || (isSelect && 'SELECT'),
        rows,
        fields,
        rowCount: data && data.length,
        affectedRows: changes || 0,
      };
    });
  }

  protected async rawExecuteQuery(
    q: string,
    options: { connection?: Database.Database } = {}
  ): Promise<SqliteResult | SqliteResult[]> {
    const connection = options.connection || this._rawConnection;
    const ownOptions = { ...options, connection };
    if (this.isRemote) {
      // FIXME disable arrayMode for now as stmt.raw() doesn't work for remote connection
      return await super.rawExecuteQuery(q, { ...ownOptions, arrayMode: false });
    }
    return await super.rawExecuteQuery(q, ownOptions)
  }

  // @ts-expect-error not fully typed
  protected createRawConnection(filename: string) {
    return new Database(filename, {
      // @ts-expect-error not fully typed
      authToken: this.useAuthToken ? this.libsqlOptions.authToken : undefined,
      syncUrl: this.libsqlOptions.syncUrl,
      syncPeriod: this.libsqlOptions.syncPeriod
        ? Number(this.libsqlOptions.syncPeriod)
        : undefined,
    });
  }

  protected checkReader(
    ...args: Parameters<SqliteClient["checkReader"]>
  ): boolean {
    if (this.isRemote) {
      // statement.reader will always return false in remote connection, which
      // cause `rawExecuteQuery` to return an empty data.
      return true;
    }
    return super.checkReader(...args);
  }

  protected createCursor(
    ...args: ConstructorParameters<typeof SqliteCursor>
  ): LibSQLCursor {
    const options: LibSQLCursorOptions = {
      isRemote: this.isRemote,
      authToken: this.useAuthToken ? this.libsqlOptions.authToken : undefined,
    };
    args[4] = options;
    // @ts-expect-error not fully typed
    return new LibSQLCursor(...args);
  }

  protected _createDatabase(path: string) {
    if (this.isRemote) {
      throw new Error("Creating database on remote server is not supported");
    }
    const conn = new Database(path);
    conn.close();
  }

  private get useAuthToken(): boolean {
    return this.libsqlOptions.mode === "url" && !!this.libsqlOptions.authToken;
  }

  private get libsqlOptions() {
    return this.server.config.libsqlOptions;
  }

  parseQueryResultColumns(qr: SqliteResult): BksField[] {
    if (qr.columns.length > 0) {
      return super.parseQueryResultColumns(qr);
    }

    const columns: BksField[] = [];

    if (qr.rows[0]) {
      Object.keys(qr.rows[0]).forEach((key) => {
        const isBlob = qr.rows.some(
          (row: any) =>
            !_.isNil(row[key]) &&
              (_.isBuffer(row[key]) || _.isArrayBuffer(row[key]))
        );
        columns.push({
          name: key,
          bksType: isBlob ? "BINARY" : "UNKNOWN",
        });
      });
    }

    return columns;
  }
}
