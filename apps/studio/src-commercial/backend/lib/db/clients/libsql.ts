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

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult> {
    const query = await this.selectTopSql(table, offset, limit, orderBy, filters, schema, selects);
    const result = await this.driverExecuteSingle(query);
    const columns = await this.listTableColumns(table);
    const fields: BksField[] = columns.map((column) => column.bksField);
    const rows = await this.serializeQueryResult(result, fields);
    return { result: rows, fields };
  }

  protected async rawExecuteQuery(
    q: string,
    options: { connection?: Database.Database } = {}
  ): Promise<SqliteResult | SqliteResult[]> {
    const connection = options.connection || this._rawConnection;
    const ownOptions = { ...options, connection };
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
}
