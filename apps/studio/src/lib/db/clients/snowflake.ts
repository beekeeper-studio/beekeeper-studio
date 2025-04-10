import { TableKey } from "@/shared/lib/dialects/models";
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, NgQueryResult, DatabaseFilterOptions, TableProperties, PrimaryKeyColumn, OrderBy, TableFilter, TableResult, StreamResults, BksField } from "../models";
import { BaseV1DatabaseClient } from "./BaseV1DatabaseClient";
import { IDbConnectionServer } from "../backendTypes";
import { IDbConnectionDatabase } from "../types";
import { ExecutionContext, QueryLogOptions } from "./BasicDatabaseClient";
import snowflake from 'snowflake-sdk'
import rawLog from '@bksLogger'

const log = rawLog.scope('SnowflakeClient')

interface SnowflakeResult {
  rows: any[]
  arrayMode: boolean
  columns: any
}

const snowflakeContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null;
  }
}



export class SnowflakeClient extends BaseV1DatabaseClient<SnowflakeResult> {

  config: any = {}
  // pool: snowflake.Pool<snowflake.Connection>
  connection: snowflake.Connection
  connectionId: string

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, snowflakeContext, server, database)
  }

  async connect(): Promise<void> {
    await super.connect()
    // TODO: Set up the connection using a pool instead
    // - but then, how does SSO work?
    const snowflakeOptions = this.server.config.snowflakeOptions
    this.config = this.server.config
    // https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver-connect#label-create-single-connection
    const potentialConnection = snowflake.createConnection({
      account: snowflakeOptions.account,
      username: this.config.user,
      password: this.config.password,
      application: "Beekeeper Studio"
    })

    /**
     * TODO: Implement other auth methods
     * https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver-authenticate
     * - SSO via browser
     * - Okta (maybe, this requires my app to know the okta creds)
     * - key-pair authentication and key-pair rotation
     * - Oauth
     * - MFA passcode (user/pass + mfa - requires a modal)
     * - Authentication token caching? No, we shouldn't do this
     */


    const result = new Promise<snowflake.Connection>((resolve, reject) => {
      // TODO call connectAsync when connecting with SSO instead
      potentialConnection.connect((err, conn) => {
        if (err) {
          log.error("failed to connect", err)
          reject(err);
        } else {
          log.debug("connection established")
          this.connectionId = conn.getId()
          resolve(conn)
        }
      })

    })

    this.connection = await result
    log.debug("checking if ready to accept queries...")
    await this.connection.isValidAsync()
    log.debug("connection is valid and ready")

  }

  supportedFeatures(): Promise<SupportedFeatures> {
    throw new Error("Method not implemented.");
  }
  versionString(): Promise<string> {
    throw new Error("Method not implemented.");
  }
  listTables(filter?: FilterOptions): Promise<TableOrView[]> {

    throw new Error("Method not implemented.");
  }
  listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    throw new Error("Method not implemented.");
  }
  listRoutines(filter?: FilterOptions): Promise<Routine[]> {
    throw new Error("Method not implemented.");
  }
  listMaterializedViewColumns(table: string, schema?: string): Promise<TableColumn[]> {
    throw new Error("Method not implemented.");
  }
  listTableColumns(table?: string, schema?: string): Promise<ExtendedTableColumn[]> {
    throw new Error("Method not implemented.");
  }
  listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]> {
    throw new Error("Method not implemented.");
  }
  listTableIndexes(table: string, schema?: string): Promise<TableIndex[]> {
    throw new Error("Method not implemented.");
  }
  listSchemas(filter?: SchemaFilterOptions): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  getTableReferences(table: string, schema?: string): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  getTableKeys(table: string, schema?: string): Promise<TableKey[]> {
    throw new Error("Method not implemented.");
  }
  executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    throw new Error("Method not implemented.");
  }
  listDatabases(filter?: DatabaseFilterOptions): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  getTableProperties(table: string, schema?: string): Promise<TableProperties | null> {
    throw new Error("Method not implemented.");
  }
  getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]> {
    throw new Error("Method not implemented.");
  }
  getPrimaryKey(table: string, schema?: string): Promise<string | null> {
    throw new Error("Method not implemented.");
  }
  getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]> {
    throw new Error("Method not implemented.");
  }
  listCharsets(): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  getDefaultCharset(): Promise<string> {
    throw new Error("Method not implemented.");
  }
  listCollations(charset: string): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  getTableLength(table: string, schema?: string): Promise<number> {
    throw new Error("Method not implemented.");
  }
  selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult> {
    throw new Error("Method not implemented.");
  }
  selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string> {
    throw new Error("Method not implemented.");
  }
  selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> {
    throw new Error("Method not implemented.");
  }
  queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    throw new Error("Method not implemented.");
  }
  wrapIdentifier(value: string): string {
    throw new Error("Method not implemented.");
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<SnowflakeResult | SnowflakeResult[]> {

    // 1. Execute query with asyncExec set to true
    const results = await new Promise<SnowflakeResult>((resolve, reject) => {
      this.connection.execute({
        sqlText: 'CALL SYSTEM$WAIT(3, \'SECONDS\')',
        // asyncExec: true,
        complete: async function (err, stmt, rows) {
          if (err) return reject(err)
          // const queryId =  // Get the query ID
          return resolve({
            rows: rows,
            arrayMode: false,
            columns: stmt.getColumns().map((c) => ({id: c.getId(), name: c.getName()}))
          })
        }
      });
    });
    return results

    //@ts-ignore
    // const statement = await this.connection.getResultsFromQueryId({ queryId: queryId })


    // 2. Get results using the query ID

  }
  protected parseTableColumn(column: any): BksField {
    throw new Error("Method not implemented.");
  }

}