import { TableKey } from "@/shared/lib/dialects/models";
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, NgQueryResult, DatabaseFilterOptions, TableProperties, PrimaryKeyColumn, OrderBy, TableFilter, TableResult, StreamResults, BksField, BksFieldType, CancelableQuery, QueryResult } from "../models";
import { BaseV1DatabaseClient } from "./BaseV1DatabaseClient";
import { IDbConnectionServer } from "../backendTypes";
import { IDbConnectionDatabase, IDbConnectionServerConfig } from "../types";
import { ExecutionContext, QueryLogOptions } from "./BasicDatabaseClient";
import snowflake from 'snowflake-sdk'
import rawLog from '@bksLogger'
import { SnowflakeData } from "@/shared/lib/dialects/snowflake";
import { identify } from 'sql-query-identifier';
import { errorMessages } from './utils';

const log = rawLog.scope('SnowflakeClient')

interface SnowflakeResult {
  rows: any[]
  arrayMode: boolean
  columns: {
    id: string
    name: string
    dataType?: string
  }[]
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

  config: IDbConnectionServerConfig
  // pool: snowflake.Pool<snowflake.Connection>
  connection: snowflake.Connection
  connectionId: string

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, snowflakeContext, server, database)
  }

  async connect(): Promise<void> {
    log.info("CONNECT")
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
      application: "BEEKEEPERSTUDIO",
      database: this.database.database
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
    const rows = Array.isArray(result) ? result[0].rows : result.rows;

    return rows.map(row => ({
      schema: row.SCHEMA || row.schema,
      name: row.NAME || row.name,
      entityType: 'table'
    }));
  }
  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    const schemaFilter = filter?.schema
      ? `AND TABLE_SCHEMA = ${SnowflakeData.escapeString(filter.schema, true)}`
      : '';

    const sql = `
      SELECT
        TABLE_SCHEMA as schema,
        TABLE_NAME as name
      FROM INFORMATION_SCHEMA.VIEWS
      WHERE 1=1
      ${schemaFilter}
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;

    try {
      const result = await this.rawExecuteQuery(sql, {});
      const rows = Array.isArray(result) ? result[0].rows : result.rows;

      return rows.map(row => ({
        schema: row.SCHEMA || row.schema,
        name: row.NAME || row.name,
        entityType: 'view'
      }));
    } catch (error) {
      log.error('Error listing views', error);
      return [];
    }
  }
  async listRoutines(filter?: FilterOptions): Promise<Routine[]> {
    // TODO: Implement listing of stored procedures, functions and other routines
    return [];
  }
  async listMaterializedViewColumns(table: string, schema?: string): Promise<TableColumn[]> {
    // TODO: Implement materialized view columns support
    return [];
  }
  async listTableColumns(table?: string, schema?: string): Promise<ExtendedTableColumn[]> {
    if (!table) return [];

    // For Snowflake, use the SHOW COLUMNS command which gives better type information
    // than INFORMATION_SCHEMA.COLUMNS
    let tableSpec = SnowflakeData.wrapIdentifier(table);
    if (schema) {
      tableSpec = `${SnowflakeData.wrapIdentifier(schema)}.${tableSpec}`;
    }

    const sql = `SHOW COLUMNS IN TABLE ${tableSpec}`;

    try {
      const result = await this.rawExecuteQuery(sql, {});
      const rows = Array.isArray(result) ? result[0].rows : result.rows;

      // Track position since SHOW COLUMNS doesn't include ordinal position
      let position = 1;
      log.info("listTableColumns", rows)
      return rows.map(row => {
        // Parse data_type which is a JSON string containing type information
        let dataTypeInfo: any = {};
        let dataType = '';
        let charMaxLength = null;
        let precision = null;
        let scale = null;

        try {
          // Snowflake returns data_type as a JSON string with type details
          if (row.data_type) {
            dataTypeInfo = typeof row.data_type === 'string' ?
              JSON.parse(row.data_type) : row.data_type;

            // Extract the base type
            dataType = dataTypeInfo.type || '';

            // Extract length for text/binary fields
            if (dataTypeInfo.length) {
              charMaxLength = parseInt(dataTypeInfo.length, 10);
            }

            // Extract precision/scale for numeric fields
            if (dataTypeInfo.precision) {
              precision = parseInt(dataTypeInfo.precision, 10);
            }

            if (dataTypeInfo.scale) {
              scale = parseInt(dataTypeInfo.scale, 10);
            }
          }
        } catch (e) {
          log.error(`Error parsing data type for column ${row.column_name}`, e);
          dataType = row.data_type || '';
        }

        // Create the column object with all available information
        const column: ExtendedTableColumn = {
          tableName: row.table_name,
          columnName: row.column_name,
          dataType: dataType,
          schemaName: row.schema_name,
          nullable: row.null === 'true' || row.null === true, // Handles both string and boolean
          defaultValue: row.default,
          ordinalPosition: position++,
          hasDefault: !!row.default,
          description: row.comment,
          bksField: this.parseTableColumn({
            columnName: row.column_name,
            dataType: dataType
          })
        };

        // Add size for character fields
        if (charMaxLength !== null) {
          column.size = charMaxLength;
        }

        // Add precision and scale for numeric fields
        if (precision !== null) {
          column.numericPrecision = precision;
          column.numericScale = scale || 0;
        }

        return column;
      });
    } catch (error) {
      log.error(`Error listing table columns for ${table}`, error);

      // Fallback to INFORMATION_SCHEMA if SHOW COLUMNS fails
      log.debug('Falling back to INFORMATION_SCHEMA.COLUMNS');

      const schemaFilter = schema
        ? `AND TABLE_SCHEMA = ${SnowflakeData.escapeString(schema, true)}`
        : '';

      const fallbackSql = `
        SELECT
          COLUMN_NAME as column_name,
          DATA_TYPE as data_type,
          IS_NULLABLE as null?,
          CHARACTER_MAXIMUM_LENGTH as char_max_length,
          NUMERIC_PRECISION as precision,
          NUMERIC_SCALE as scale,
          COLUMN_DEFAULT as default,
          ORDINAL_POSITION as ordinal_position,
          COMMENT as comment,
          TABLE_NAME as table_name,
          TABLE_SCHEMA as schema_name
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ${SnowflakeData.escapeString(table, true)}
        ${schemaFilter}
        ORDER BY ORDINAL_POSITION
      `;

      try {
        const fallbackResult = await this.rawExecuteQuery(fallbackSql, {});
        const fallbackRows = Array.isArray(fallbackResult) ? fallbackResult[0].rows : fallbackResult.rows;

        return fallbackRows.map(row => {
          const column: ExtendedTableColumn = {
            tableName: row.table_name,
            columnName: row.column_name,
            dataType: row.data_type,
            schemaName: row.schema_name,
            nullable: row.null === 'YES' || row.null === true,
            defaultValue: row.default,
            ordinalPosition: row.ordinal_position,
            size: row.char_max_length,
            description: row.comment,
            bksField: this.parseTableColumn({
              columnName: row.column_name,
              dataType: row.data_type
            })
          };

          if (row.precision !== null) {
            column.numericPrecision = row.precision;
            column.numericScale = row.scale;
          }

          return column;
        });
      } catch (fallbackError) {
        log.error(`Fallback query also failed for ${table}`, fallbackError);
        return [];
      }
    }
  }
  async listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]> {
    // TODO: Implement table triggers listing
    return [];
  }
  async listTableIndexes(table: string, schema?: string): Promise<TableIndex[]> {
    // TODO: Implement table indexes listing
    return [];
  }
  async listSchemas(filter?: SchemaFilterOptions): Promise<string[]> {
    const sql = `
      SELECT
        SCHEMA_NAME as name
      FROM INFORMATION_SCHEMA.SCHEMATA
      WHERE 1=1
      ORDER BY SCHEMA_NAME
    `;

    try {
      const result = await this.rawExecuteQuery(sql, {});
      const rows = Array.isArray(result) ? result[0].rows : result.rows;
      return rows.map(row => row.NAME);
    } catch (error) {
      log.error('Error listing schemas', error);
      return [];
    }
  }
  async getTableReferences(table: string, schema?: string): Promise<string[]> {
    // throw new Error("Method not implemented.");
    return []
  }
  async getTableKeys(table: string, schema?: string): Promise<TableKey[]> {
    // throw new Error("Method not implemented.");
    return []
  }

  async query(text: string, _options: any): Promise<CancelableQuery> {
    // It executes, but:
    // TODO: SILENTLY FAILS STILL
    // TODO: All the results are null!

    let statement: snowflake.RowStatement

    return {
      cancel: async () => {
        if (statement) {
          statement.cancel()
        }
      },
      execute: () => new Promise<QueryResult>((resolve, reject) => {
        this.connection.execute({
          sqlText: text, asyncExec: true,
          complete: async (e, s) => {
            if (e) return reject(e);
            const queryId = s.getQueryId()
            statement = s
            // @ts-ignore
            const result = this.connection.getResultsFromQueryId({
              queryId: queryId,
              complete: async (err, stmt, rows) => {
                if (err) return reject(err);
                return resolve([{
                  rows, fields: this.statementToColumns(stmt)
                }])
              }
            })
          }
        })
      })
    }
  }

  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    try {
      const statements = identify(queryText, { strict: false, dialect: 'generic' });
      if (this.violatesReadOnly(statements, options)) {
        throw new Error(errorMessages.readOnly);
      }

      log.debug('executing query', { queryText });
      const result = await this.rawExecuteQuery(queryText, options);
      const results = Array.isArray(result) ? result : [result];

      return results.map(queryResult => {
        // Extract column types from the statement result if available
        const fields = queryResult.columns.map(col => ({
          name: col.name,
          id: col.id || col.name,
          // Include dataType if available from the Snowflake API
          dataType: col.dataType || null
        }));

        return {
          fields,
          rows: queryResult.rows,
          rowCount: queryResult.rows.length,
          command: 'SELECT', // This is a simplification, should be determined from the query
        };
      });
    } catch (error) {
      log.error('Error executing query', error);
      throw error;
    }
  }
  async listDatabases(filter?: DatabaseFilterOptions): Promise<string[]> {
    const sql = `
      SHOW DATABASES
    `;

    try {
      const result = await this.rawExecuteQuery(sql, {});
      const rows = Array.isArray(result) ? result[0].rows : result.rows;
      return rows.map(row => row.name || row.NAME);
    } catch (error) {
      log.error('Error listing databases', error);
      return [];
    }
  }
  async getTableProperties(table: string, schema?: string): Promise<TableProperties | null> {
    // TODO: Implement table properties retrieval
    return null;
  }
  async getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string> {
    // TODO: Implement proper query formatting with schema handling
    const tableName = schema ? `${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)}` : this.wrapIdentifier(table);
    return `SELECT * FROM ${tableName} LIMIT ${limit}`;
  }
  async listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]> {
    // TODO: Implement materialized views listing for Snowflake
    // Note: Snowflake doesn't have true materialized views but has similar concepts
    return [];
  }
  async getPrimaryKey(table: string, schema?: string): Promise<string | null> {
    // TODO: Implement primary key retrieval
    return null;
  }
  async getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]> {
    // TODO: Implement primary keys columns retrieval
    return [];
  }
  async listCharsets(): Promise<string[]> {
    // TODO: Implement charsets listing or determine if Snowflake supports this concept
    return [];
  }
  async getDefaultCharset(): Promise<string> {
    // TODO: Implement default charset retrieval or determine if Snowflake has this concept
    return '';
  }
  async listCollations(charset: string): Promise<string[]> {
    // TODO: Implement collations listing or determine if Snowflake has this concept
    return [];
  }
  async getTableLength(table: string, schema?: string): Promise<number> {
    // TODO: Implement proper table row count
    try {
      const tableName = schema ? `${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)}` : this.wrapIdentifier(table);
      const result = await this.rawExecuteQuery(`SELECT COUNT(1) AS total FROM ${tableName}`, {});
      const data = Array.isArray(result) ? result[0].rows[0] : result.rows[0];
      return data.TOTAL || 0;
    } catch (error) {
      log.error(`Error getting table length for ${table}`, error);
      return 0;
    }
  }
  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult> {
    // TODO: Implement full selectTop functionality with filters
    const sql = await this.selectTopSql(table, offset, limit, orderBy, filters, schema, selects);
    const results = await this.executeQuery(sql);

    if (!results || !results[0]) {
      return { result: [], fields: [] };
    }

    // Create BksFields from the query result
    const fields: BksField[] = results[0].fields.map(field => {
      // Check if the field type is binary
      const isBinary = field.dataType?.toLowerCase() === 'binary' ||
                      field.dataType?.toLowerCase() === 'varbinary';

      return {
        name: field.name,
        bksType: isBinary ? 'BINARY' : 'UNKNOWN'
      };
    });

    // Return the correctly structured TableResult
    return {
      result: results[0].rows || [],
      fields: fields
    };
  }
  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string> {
    // TODO: Implement full SQL generation with proper filters and ordering
    const tableName = schema ? `${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)}` : this.wrapIdentifier(table);
    const selectClause = selects && selects.length > 0 ? selects.join(', ') : '*';
    const orderByClause = orderBy && orderBy.length > 0
      ? `ORDER BY ${orderBy.map(item => `${this.wrapIdentifier(item.field)} ${item.dir}`).join(', ')}`
      : '';

    return `SELECT ${selectClause} FROM ${tableName} ${orderByClause} LIMIT ${limit} OFFSET ${offset}`;
  }
  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> {
    // TODO: Implement streaming results for large datasets
    throw new Error("Streaming not yet implemented for Snowflake");
  }
  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    // TODO: Implement query streaming for large results
    throw new Error("Query streaming not yet implemented for Snowflake");
  }
  wrapIdentifier(value: string): string {
    return SnowflakeData.wrapIdentifier(value);
  }


  protected statementToColumns(statement: snowflake.RowStatement) {
    const columns = statement.getColumns().map((c) => {
      const columnInfo = {
        id: c.getId().toString(),
        name: c.getName(),
        dataType: c.getType()
      };
      return columnInfo;
    });
    return columns
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<SnowflakeResult | SnowflakeResult[]> {
    // Execute query
    const results = await new Promise<SnowflakeResult>((resolve, reject) => {
      this.connection.execute({
        sqlText: q,
        complete: (err, stmt, rows) => {
          if (err) return reject(err);
          // Extract column information including type data if available
          return resolve({
            rows: rows,
            arrayMode: false,
            columns: this.statementToColumns(stmt)
          });
        }
      });
    });
    console.log("SNOWFLAKE RESULTS", results)
    return results;
  }
  protected parseQueryResultColumns(qr: SnowflakeResult): BksField[] {
    return qr.columns.map((column) => {
      let bksType: BksFieldType = 'UNKNOWN';

      // Check if the column type is available and is a binary type
      if (column.type?.toUpperCase() === 'BINARY' || column.type?.toUpperCase() === 'VARBINARY') {
        bksType = 'BINARY';
      }

      return {
        name: column.name,
        bksType
      };
    });
  }

  protected parseTableColumn(column: any): BksField {
    const { columnName, dataType } = column;

    // Map Snowflake data types to BksFieldType (only BINARY, UNKNOWN, or OBJECTID are valid)
    // Reference: https://docs.snowflake.com/en/sql-reference/data-types
    let bksType: BksFieldType = 'UNKNOWN';
    switch (dataType?.toUpperCase()) {
      case 'BINARY':
      case 'VARBINARY':
        bksType = 'BINARY';
        break;
      default:
        bksType = 'UNKNOWN';
    }

    return {
      name: columnName,
      bksType
    };
  }

}
