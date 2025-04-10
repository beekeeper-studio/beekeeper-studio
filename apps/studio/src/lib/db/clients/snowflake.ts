import { TableKey } from "@/shared/lib/dialects/models";
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, NgQueryResult, DatabaseFilterOptions, TableProperties, PrimaryKeyColumn, OrderBy, TableFilter, TableResult, StreamResults, BksField, BksFieldType } from "../models";
import { BaseV1DatabaseClient } from "./BaseV1DatabaseClient";
import { IDbConnectionServer } from "../backendTypes";
import { IDbConnectionDatabase } from "../types";
import { ExecutionContext, QueryLogOptions } from "./BasicDatabaseClient";
import snowflake from 'snowflake-sdk'
import rawLog from '@bksLogger'
import { SnowflakeData } from "@/shared/lib/dialects/snowflake";

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
      application: "BEEKEEPERSTUDIO"
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

  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: false,
      comments: false,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
      transactions: false
    };
  }
  async versionString(): Promise<string> {
    return '1.0.0'
  }
  async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    const schemaFilter = filter?.schema
      ? `AND TABLE_SCHEMA = ${SnowflakeData.escapeString(filter.schema, true)}`
      : '';

    const sql = `
      SELECT
        TABLE_SCHEMA as schema,
        TABLE_NAME as name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ${schemaFilter}
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;

    const result = await this.rawExecuteQuery(sql, {});
    return Array.isArray(result) ? result[0].rows : result.rows;
  }
  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    // throw new Error("Method not implemented.");
    return []
  }
  listRoutines(filter?: FilterOptions): Promise<Routine[]> {
    throw new Error("Method not implemented.");
  }
  listMaterializedViewColumns(table: string, schema?: string): Promise<TableColumn[]> {
    throw new Error("Method not implemented.");
  }
  async listTableColumns(table?: string, schema?: string): Promise<ExtendedTableColumn[]> {
    if (!table) return [];

    const schemaFilter = schema
      ? `AND TABLE_SCHEMA = ${SnowflakeData.escapeString(schema, true)}`
      : '';

    const sql = `
      SELECT
        COLUMN_NAME as columnName,
        DATA_TYPE as dataType,
        IS_NULLABLE as nullable,
        CHARACTER_MAXIMUM_LENGTH as charMaxLength,
        NUMERIC_PRECISION as precision,
        NUMERIC_SCALE as scale,
        COLUMN_DEFAULT as defaultValue,
        ORDINAL_POSITION as ordinalPosition,
        COMMENT as description
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = ${SnowflakeData.escapeString(table, true)}
      ${schemaFilter}
      ORDER BY ORDINAL_POSITION
    `;

    const result = await this.rawExecuteQuery(sql, {});
    const rows = Array.isArray(result) ? result[0].rows : result.rows;

    return rows.map(row => {
      const column: ExtendedTableColumn = {
        tableName: table,
        columnName: row.columnName,
        dataType: row.dataType,
        nullable: row.nullable === 'YES',
        defaultValue: row.defaultValue,
        ordinalPosition: row.ordinalPosition,
        size: row.charMaxLength,
        description: row.description,
        bksField: this.parseTableColumn(row)
      };

      if (row.precision !== null) {
        column.numericPrecision = row.precision;
        column.numericScale = row.scale;
      }

      return column;
    });
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
    return SnowflakeData.wrapIdentifier(value);
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<SnowflakeResult | SnowflakeResult[]> {
    // Execute query
    const results = await new Promise<SnowflakeResult>((resolve, reject) => {
      this.connection.execute({
        sqlText: q,
        complete: function (err, stmt, rows) {
          if (err) return reject(err)
          return resolve({
            rows: rows,
            arrayMode: false,
            columns: stmt.getColumns().map((c) => ({id: c.getId(), name: c.getName()}))
          })
        }
      });
    });
    return results
  }
  protected parseTableColumn(column: any): BksField {
    const { columnName, dataType, nullable, defaultValue, charMaxLength, precision, scale } = column;

    let type: BksFieldType = 'UNKNOWN';
    const length = charMaxLength;

    // Map Snowflake data types to BksFieldType
    // Reference: https://docs.snowflake.com/en/sql-reference/data-types
    switch (dataType.toUpperCase()) {
      case 'BINARY':
      case 'VARBINARY':
        type = 'BINARY';
        break;
      default:
        type = 'UNKNOWN'
    }

    return {
      name: columnName,
      bksType: type,
      // length: length || null,
      // notNull: !nullable,
      // defaultValue: defaultValue || null,
    };
  }

}