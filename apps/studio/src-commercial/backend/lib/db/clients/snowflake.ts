import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { BasicDatabaseClient, ExecutionContext, QueryLogOptions } from "@/lib/db/clients/BasicDatabaseClient";
import { DatabaseElement, IDbConnectionDatabase } from "@/lib/db/types";
import * as snowflake from "snowflake-sdk";
import { Connection, ConnectionOptions, Pool, PoolOptions } from "snowflake-sdk"
import BksConfig from "@/common/bksConfig";
import rawLog from '@bksLogger'
import { BksField, CancelableQuery, DatabaseFilterOptions, ExtendedTableColumn, FieldDescriptor, FilterOptions, NgQueryResult, OrderBy, PrimaryKeyColumn, Routine, SchemaFilterOptions, StreamResults, SupportedFeatures, TableChanges, TableColumn, TableDelete, TableFilter, TableIndex, TableInsert, TableOrView, TableProperties, TableResult, TableTrigger, TableUpdate, TableUpdateResult } from "@/lib/db/models";
import { buildDeleteQueries, buildInsertQueries, buildSchemaFilter, buildSelectQueriesFromUpdates, buildSelectTopQuery, buildUpdateQueries, errorMessages, escapeString } from "@/lib/db/clients/utils";
import _ from "lodash";
import { TableKey } from "@/shared/lib/dialects/models";
import { IdentifyResult } from "sql-query-identifier/lib/defines";
import { identify } from "sql-query-identifier";
import { createCancelablePromise } from "@/common/utils";
import { errors } from "@/lib/errors";
import { SnowflakeDialect } from "@beekeeperstudio/knex-snowflake-dialect"
import knexlib from 'knex';
import { ChangeBuilderBase } from "@/shared/lib/sql/change_builder/ChangeBuilderBase";
import { SnowflakeChangeBuilder } from "@/shared/lib/sql/change_builder/SnowflakeChangeBuilder";
import { SnowflakeCursor } from "./snowflake/SnowflakeCursor";

const log = rawLog.scope('snowflake')

interface SnowflakeResult {
  columns: { name: string, type?: string | number | any }[]
  rows: Record<string, any>[];
  arrayMode: boolean;
  rowCount: number;
  affectedCount: number;
}

const snowflakeContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null;
  }
};

type RawSnowflakeStatement = snowflake.RowStatement | snowflake.FileAndStageBindStatement;

type SnowflakeStatement = {
  rawStatement: RawSnowflakeStatement,
  queryId: Promise<string>
};

export interface VersionInfo {
  version?: string
}

export class SnowflakeClient extends BasicDatabaseClient<SnowflakeResult, Connection> {

  pool: Pool<Connection>;
  version: VersionInfo;
  _defaultSchema: string;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, snowflakeContext, server, database);
    this.dialect = "generic";
    this.readOnlyMode = server?.config?.readOnlyMode || false;

    this.knex = knexlib({
      client: SnowflakeDialect
    })

    snowflake.configure({
      logLevel: "OFF"
    })
  }

  // Snowflake supports basically an infinite number of collations so idk how we want ot handle this
  async listCharsets(): Promise<string[]> {
    return [];
  }

  async getDefaultCharset(): Promise<string> {
    return 'UTF8';
  }

  async listCollations(_charset: string): Promise<string[]> {
    return [];
  }

  async connect(): Promise<void> {
    if (!this.server && !this.database) {
      return;
    }

    await super.connect();

    const config = await this.configDatabase(this.server, this.database);
    const poolConfig = this.configPool();

    this.pool = snowflake.createPool(config, poolConfig);

    this.version = await this.getVersion();
    this._defaultSchema = await this.getSchema();
  }

  async disconnect(): Promise<void> {
    await super.disconnect();
    await this.pool.drain();
    await this.pool.clear();
  }

  // TODO (@day): need to be async? prob not
  private async configDatabase(server: IDbConnectionServer, database: IDbConnectionDatabase): Promise<ConnectionOptions> {

    if (!database.database) {
      throw new Error('Please enter a default database');
    }

    const config: ConnectionOptions = {
      account: server.config.snowflakeOptions.accountId,
      username: server.config.user,
      password: server.config.password,
      database: database.database,
      warehouse: server.config.snowflakeOptions.defaultWarehouse
    };

    return config;
  }

  private configPool(): PoolOptions {
    return {
      max: BksConfig.db.snowflake.maxConnections,
      autostart: true
    }
  }

  async versionString(): Promise<string> {
    return this.version.version;
  }

  private async getVersion(): Promise<VersionInfo> {
    const result = await this.driverExecuteSingle('SELECT current_version() AS versionString;');

    const versionString = result.rows[0]?.VERSIONSTRING;

    return {
      version: versionString
    }
  }

  getBuilder(table: string, schema?: string): ChangeBuilderBase {
    return new SnowflakeChangeBuilder(table, schema);
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: true,
      comments: true,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
      transactions: true,
      filterTypes: ['standard', 'ilike']
    }
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    // doing it this way should ensure we don't need a database selected
    const sql = `
      SHOW DATABASES;
    `;

    const data = await this.driverExecuteSingle(sql);

    return data.rows.map((row) => row.name);
  }

  async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    const schemaFilter = buildSchemaFilter(filter, 'TABLE_SCHEMA');

    let sql = `
      SELECT
        TABLE_SCHEMA as schema,
        TABLE_NAME as name,
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE NOT LIKE '%VIEW%'
      ${schemaFilter ? `AND ${schemaFilter}` : ''}
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;

    const data = await this.driverExecuteSingle(sql);

    return data.rows.map((row) => ({
      name: row.NAME,
      schema: row.SCHEMA
    } as TableOrView));
  }

  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    // TODO (@day): do we need a custom wrapIdent
    const schemaFilter = buildSchemaFilter(filter, 'TABLE_SCHEMA');

    let sql = `
      SELECT
        TABLE_SCHEMA as schema,
        TABLE_NAME as name,
      FROM INFORMATION_SCHEMA.VIEWS
      ${schemaFilter ? `AND ${schemaFilter}` : ''}
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;

    const data = await this.driverExecuteSingle(sql);

    return data.rows.map((row) => ({
      name: row.NAME,
      schema: row.SCHEMA
    } as TableOrView));
  }

  // TODO (@day): this may be annoying lmao
  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    return [];
  }

  // TODO (@day): this requires enterprise edition
  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return [];
  }

  // TODO (@day): this requires enterprise edition
  async listMaterializedViewColumns(_table: string, _schema?: string): Promise<TableColumn[]> {
    return [];
  }

  async listTableColumns(table?: string, schema: string = 'PUBLIC'): Promise<ExtendedTableColumn[]> {
    const clause = table ? "WHERE TABLE_SCHEMA = :1 AND TABLE_NAME = :2" : "";
    const params = table ? [schema, table] : [];
    if (table && !schema) {
      throw new Error(`Table '${table}' provided for listTableColumns, but no schema name`);
    }

    const sql = `
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        COLUMN_NAME,
        IS_NULLABLE,
        CASE
          WHEN DATA_TYPE_ALIAS IS NOT NULL
            THEN DATA_TYPE_ALIAS
          WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL
            THEN DATA_TYPE || '(' || CHARACTER_MAXIMUM_LENGTH::varchar(255) || ')'
          WHEN NUMERIC_PRECISION IS NOT NULL AND NUMERIC_SCALE IS NOT NULL
            THEN DATA_TYPE || '(' || NUMERIC_PRECISION::varchar(255) || ',' || NUMERIC_SCALE::varchar(255) || ')'
          WHEN NUMERIC_PRECISION IS NOT NULL AND NUMERIC_SCALE IS NULL
            THEN DATA_TYPE || '(' || NUMERIC_PRECISION::varchar(255) || ')'
          ELSE DATA_TYPE
        END as DATA_TYPE,
        CASE
          WHEN DATA_TYPE = 'ARRAY' THEN 'YES'
          ELSE 'NO'
        END AS IS_ARRAY,
        COMMENT,
        ORDINAL_POSITION,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      ${clause}
      ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    `;

    const data = await this.driverExecuteSingle(sql, { params });

    return data.rows.map((row: any) => ({
      schemaName: row.TABLE_SCHEMA,
      tableName: row.TABLE_NAME,
      columnName: row.COLUMN_NAME,
      dataType: row.DATA_TYPE,
      nullable: row.IS_NULLABLE === 'YES',
      defaultValue: row.COLUMN_DEFAULT,
      ordinalPosition: Number(row.ORDINAL_POSITION),
      hasDefault: !_.isNil(row.COLUMN_DEFAULT),
      array: row.is_array === "YES",
      comment: row.COMMENT || null,
      bksField: this.parseTableColumn(row)
    }))
  }

  // afaik this doesn't exist in snowflake, unless we want to shove tasks and streams into here
  async listTableTriggers(_table: string, _schema?: string): Promise<TableTrigger[]> {
    return [];
  }

  // Only available on hybrid tables, which I can't create on a trial account :(
  async listTableIndexes(_table: string, _schema?: string): Promise<TableIndex[]> {
    return [];
  }

  async listSchemas(filter?: SchemaFilterOptions): Promise<string[]> {
    const schemaFilter = buildSchemaFilter(filter, 'SCHEMA_NAME');

    const sql = `
      SELECT
        SCHEMA_NAME
      FROM INFORMATION_SCHEMA.SCHEMATA
      ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
      ORDER BY SCHEMA_NAME
    `;

    const data = await this.driverExecuteSingle(sql);

    return data.rows.map((row) => row.SCHEMA_NAME);
  }

  async getOutgoingKeys(table: string, schema?: string): Promise<TableKey[]> {
    const sql = `
      SHOW IMPORTED KEYS IN TABLE ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)};
    `;

    const data = await this.driverExecuteSingle(sql);

    const groupedKeys = _.groupBy(data.rows, 'fk_name');

    return Object.keys(groupedKeys).map(constraintName => {
      const keyParts = groupedKeys[constraintName];

      const firstPart = keyParts[0];

      const key: TableKey = {
        constraintName: firstPart.fk_name,
        toTable: firstPart.pk_table_name,
        toSchema: firstPart.pk_schema_name,
        fromTable: firstPart.fk_table_name,
        fromSchema: firstPart.fk_schema_name,
        onUpdate: firstPart.update_rule,
        onDelete: firstPart.delete_rule,

        toColumn: firstPart.pk_column_name,
        fromColumn: firstPart.fk_column_name,
        isComposite: false
      };

      if (keyParts.length > 1) {
        key.toColumn = keyParts.map(p => p.pk_column_name);
        key.fromColumn = keyParts.map(p => p.fk_column_name);
        key.isComposite = true;
      }

      return key;
    });
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string | null> {
    const keys = await this.getPrimaryKeys(table, schema);
    return keys.length === 1 ? keys[0].columnName : null;
  }

  async getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]> {
    const sql = `
      SHOW PRIMARY KEYS IN TABLE ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)}
    `;

    const data = await this.driverExecuteSingle(sql);

    if (data?.rows && data.rows.length > 0) {
      return data.rows.map((r) => ({
        columnName: r.column_name,
        position: r.key_sequence
      }))
    }
  }

  async getIncomingKeys(table: string, schema?: string): Promise<TableKey[]> {
    const sql = `
      SHOW EXPORTED KEYS IN TABLE ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)};
    `;

    const data = await this.driverExecuteSingle(sql);

    const groupedKeys = _.groupBy(data.rows, 'fk_name');

    return Object.keys(groupedKeys).map(constraintName => {
      const keyParts = groupedKeys[constraintName];

      const firstPart = keyParts[0];

      const key: TableKey = {
        constraintName: firstPart.fk_name,
        toTable: firstPart.pk_table_name,
        toSchema: firstPart.pk_schema_name,
        fromTable: firstPart.fk_table_name,
        fromSchema: firstPart.fk_schema_name,
        onUpdate: firstPart.update_rule,
        onDelete: firstPart.delete_rule,

        toColumn: firstPart.pk_column_name,
        fromColumn: firstPart.fk_column_name,
        isComposite: false
      };

      if (keyParts.length > 1) {
        key.toColumn = keyParts.map(p => p.pk_column_name);
        key.fromColumn = keyParts.map(p => p.fk_column_name);
        key.isComposite = true;
      }

      return key;
    });
  }

  async query(queryText: string, tabId: number, _options?: any): Promise<CancelableQuery> {
    let stmt: snowflake.RowStatement | snowflake.FileAndStageBindStatement = null;
    const hasReserved = this.reservedConnections.has(tabId);
    const conn = hasReserved ? this.peekConnection(tabId) : await this.pool.acquire();
    const cancelable = createCancelablePromise(errors.CANCELED_BY_USER);

    return {
      execute: async(): Promise<NgQueryResult[]> => {
        // TODO (@day): use the snowflake dialect
        log.info('RUNNING: ', queryText);
        const commands = identify(queryText, { strict: false, dialect: undefined });
        if (await this.checkAllowReadOnly() && this.violatesReadOnly(commands)) {
          throw new Error(errorMessages.readOnly);
        }

        const queries: { queryId: string, command: IdentifyResult }[] = [];
        for (const command of commands) {
          if (cancelable.canceled) return [];

          const result = await this.runToStatement(command.text, { connection: conn, arrayMode: true })
          stmt = result.rawStatement;

          const queryId = await Promise.race([
            cancelable.wait(),
            result.queryId
          ]);

          if (queryId) {
            queries.push({ queryId, command });
          }
        }

        const results: NgQueryResult[] = []
        for (const query of queries) {
          const result = await this.getQueryResultFromId<NgQueryResult>(query.queryId, conn, true, (stmt, rows) => {
            const command = query.command;
            const columns: FieldDescriptor[] = stmt.getColumns()?.map((v, idx) => ({
              name: v.getName(),
              id: `c${idx}`,
              dataType: v.getType()
            })) ?? [];
            const updatedRows = stmt.getNumUpdatedRows();

            const fieldIds = columns.map(c => c.id);
            const result: NgQueryResult = {
              command: command?.type,
              text: command?.text,
              rows: rows?.map(r => _.zipObject(fieldIds, r)) ?? [],
              fields: columns,
              rowCount: stmt.getNumRows(),
              affectedRows: updatedRows > 0 ? updatedRows : 0
            }
            return result;
          });

          results.push(result);
        }

        if (!hasReserved) {
          this.pool.release(conn);
        }

        return results;
      },
      cancel: async(): Promise<void> => {
        if (!stmt) {
          throw new Error('No statement to cancel');
        }

        stmt.cancel();
        cancelable.cancel();
      }
    }
  }


  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    const data = await this.driverExecuteMultiple(queryText, options);

    const commands = identify(queryText, { strict: false });

    return data.map((r, idx) => {
      const command = commands[idx];
      return {
        command: command?.type,
        text: command?.text,
        rows: r.rows,
        rowCount: r.rowCount,
        affectedRows: r.affectedCount,
        fields: r.columns.map((c) => ({
          name: c.name,
          id: c.name,
          dataType: c.type
        }))
      }
    });
  }

  async executeApplyChanges(changes: TableChanges, tabId?: number): Promise<TableUpdateResult[]> {
    let results: TableUpdateResult[] = [];

    const run = async (connection: Connection) => {
      if (changes.inserts) {
        await this.insertRows(changes.inserts, connection);
      }

      if (changes.updates) {
        results = await this.updateValues(changes.updates, connection);
      }

      if (changes.deletes) {
        await this.deleteRows(changes.deletes, connection);
      }
    }

    if (tabId) {
      const conn = this.peekConnection(tabId);
      await run(conn);
    } else {
      await this.runWithTransaction(run);
    }

    return results;
  }

  async getTableLength(table?: string, schema?: string): Promise<number> {
    const sql = `
      SHOW TABLES LIKE :1 IN SCHEMA ${this.wrapIdentifier(schema)}
    `;

    const params = [table];
    const data = await this.driverExecuteSingle(sql, { params });

    if (data?.rows && data?.rows.length > 0) {
      const numRecords = data?.rows[0]?.rows;
      return Number(numRecords);
    }

    return 0;
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string> {
    const columns = await this.listTableColumns(table, schema);
    const { query, params } = buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      "total",
      columns,
      selects,
      schema,
      this.wrapIdentifier
    );

    return this.knex.raw(query, params).toQuery();
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult> {
    const columns = await this.listTableColumns(table, schema);
    const queries = buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      "total",
      columns,
      selects,
      schema,
      this.wrapIdentifier
    );
    const { query, params } = queries;
    const result = await this.driverExecuteSingle(query, { params });
    const fields = columns.map((v) => v.bksField).filter((v) => selects && selects.length > 0 ? selects.includes(v.name) : true);
    const rows = await this.serializeQueryResult(result, fields);
    return {
      result: rows, fields
    }
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> {
    const columns = await this.listTableColumns(table, schema);
    const queries = buildSelectTopQuery(
      table,
      null,
      null,
      orderBy,
      filters,
      "total",
      columns,
      ['*'],
      schema,
      this.wrapIdentifier
    );
    const rowCount = await this.driverExecuteSingle(queries.countQuery, { params: queries.params });

    const cursorOptions = {
      query: queries.query,
      params: queries.params,
      pool: this.pool,
      chunkSize
    };

    return {
      totalRows: Number(rowCount.rows[0].total),
      columns,
      cursor: new SnowflakeCursor(cursorOptions)
    }
  }

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    const options = {
      query,
      params: [],
      pool: this.pool,
      chunkSize
    };

    const cursor = new SnowflakeCursor(options);

    const { columns, totalRows } = await this.getColumnsAndTotalRows(query);

    return {
      totalRows,
      columns,
      cursor
    };
  }

  async getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string> {
    return `SELECT * FROM ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)} LIMIT ${limit}`;
  }

  async getTableProperties(table: string, schema?: string): Promise<TableProperties | null> {

  }

  async getTableCreateScript(table: string, schema?: string): Promise<string> {
    // TODO (@day): I'm worried about escaping here
    const sql = `
      SELECT GET_DDL('TABLE', :1, TRUE) AS SCRIPT
    `;
    const params = [`${schema}.${table}`];

    const data = await this.driverExecuteSingle(sql, { params });

    return data.rows[0].SCRIPT;
  }

  async getViewCreateScript(view: string, schema?: string): Promise<string[]> {
    // TODO (@day): I'm worried about escaping here
    const sql = `
      SELECT GET_DDL('VIEWR', :1, TRUE) AS SCRIPT
    `;
    const params = [`${schema}.${view}`];

    const data = await this.driverExecuteSingle(sql, { params });

    return data.rows[0].SCRIPT;
  }

  async getRoutineCreateScript(_routine: string, _type: string, _schema?: string): Promise<string[]> {
    return [];
  }

  async createDatabase(_databaseName: string, _charset: string, _collation: string): Promise<string> {
    return '';
  }

  async createDatabaseSQL(): Promise<string> {
    return '';
  }

  async setTableDescription(table: string, description: string, schema?: string): Promise<string> {
    const identifier = this.wrapTable(table, schema);
    const comment = escapeString(description);
    const sql = `
      COMMENT ON TABLE ${identifier} IS '${comment}'
    `;
    await this.driverExecuteSingle(sql);
    // TODO (@day): get this from table properties and return
    return '';
  }

  async setElementNameSql(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<string> {
    newElementName = this.wrapIdentifier(newElementName);
    if ([DatabaseElement.TABLE, DatabaseElement.VIEW, DatabaseElement["MATERIALIZED-VIEW"]].includes(typeOfElement)) {
      elementName = this.wrapTable(elementName, schema);
    } else {
      elementName = this.wrapIdentifier(elementName);
    }

    let alterType: string = typeOfElement;
    if (typeOfElement === DatabaseElement["MATERIALIZED-VIEW"]){
      alterType = "MATERIALIZED VIEW"
    }

    return `ALTER ${alterType} ${elementName} RENAME TO ${newElementName}`;
  }

  async dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    if ([DatabaseElement.TABLE, DatabaseElement.VIEW, DatabaseElement["MATERIALIZED-VIEW"]].includes(typeOfElement)) {
      elementName = this.wrapTable(elementName, schema);
    } else {
      elementName = this.wrapIdentifier(elementName);
    }

    let dropType: string = typeOfElement;
    if (typeOfElement === DatabaseElement["MATERIALIZED-VIEW"]){
      dropType = "MATERIALIZED VIEW"
    }

    const sql = `DROP ${dropType} ${elementName}`;

    await this.driverExecuteSingle(sql);
  }

  async truncateElementSql(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<string> {
    if ([DatabaseElement.TABLE, DatabaseElement.VIEW, DatabaseElement["MATERIALIZED-VIEW"]].includes(typeOfElement)) {
      elementName = this.wrapTable(elementName, schema);
    } else {
      elementName = this.wrapIdentifier(elementName);
    }

    let truncateType: string = typeOfElement;
    if (typeOfElement === DatabaseElement["MATERIALIZED-VIEW"]){
      truncateType = "MATERIALIZED VIEW"
    }

    return `TRUNCATE ${truncateType} ${elementName}`;
  }

  async truncateAllTables(_schema?: string): Promise<void> {
    // this isn't used anywhere afaik
  }

  async duplicateTable(tableName: string, duplicateTableName: string, schema?: string): Promise<void> {
    const sql = await this.duplicateTableSql(tableName, duplicateTableName, schema);

    await this.driverExecuteSingle(sql);
  }

  async duplicateTableSql(tableName: string, duplicateTableName: string, schema: string = this._defaultSchema): Promise<string> {
    const sql = `
      CREATE TABLE ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(duplicateTableName)}
      CLONE ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(tableName)}
    `;

    return sql;
  }

  async runWithConnection<T>(run: (conn: Connection) => Promise<T>): Promise<T> {
    const connection = await this.pool.acquire();
    try {
      return await run(connection);
    } finally {
      await this.pool.release(connection);
    }
  }

  private async runWithTransaction<T>(run: (conn: Connection) => Promise<T>): Promise<T> {
    return await this.runWithConnection(async (connection) => {
      await this.driverExecuteSingle('BEGIN TRANSACTION', { connection });
      try {
        const result = await run(connection);
        await this.driverExecuteSingle('COMMIT', { connection });
        return result
      } catch(ex) {
        log.warn("Error in transaction - rolling back ", ex.message);
        await this.driverExecuteSingle('ROLLBACK', { connection });
        throw ex;
      }
    })

  }

  private async getQueryResultFromId<T>(queryId: string, conn: Connection, rowResults: boolean, formatResults: (stmt: RawSnowflakeStatement, rows: any[]) => T): Promise<T> {
    return await new Promise<T>(async (resolve, reject) => {
      const snowflakeStmt = await conn.getResultsFromQueryId({
        queryId,
        rowMode: rowResults ? 'array' : 'object_with_renamed_duplicated_columns'
      });
      const stream = snowflakeStmt.streamRows();
      const rows: any[] = [];

      stream.on('error', err => {
        reject(err)
      })

      stream.on('data', row => {
        rows.push(row);
      })

      stream.on('end', () => {
        const result = formatResults(snowflakeStmt, rows);
        resolve(result);
      })
    })
  }

  private async runToStatement(query: string, options: {
    params?: snowflake.Bind[],
    connection: Connection,
    arrayMode?: boolean,
  }): Promise<SnowflakeStatement> {
    if (!options.connection) {
      throw new Error('Connection required to run to statement');
    }
    let stmt: RawSnowflakeStatement;

    const queryId = new Promise<string>((resolve, reject) => {
      options.connection.execute({
        sqlText: query,
        binds: options.params,
        asyncExec: true,
        streamResult: true,
        parameters: {
          MULTI_STATEMENT_COUNT: 1
        },
        rowMode: options.arrayMode ? 'array' : 'object_with_renamed_duplicated_columns',
        complete: (err, stmt) => {
          if (err) {
            log.error(err.message);
            reject(err);
          }

          const queryId = stmt.getQueryId();
          resolve(queryId);
        }
      });
    });

    return {
      rawStatement: stmt,
      queryId
    };
  }

  protected async rawExecuteQuery(q: string, options?: {
    params?: snowflake.Bind[],
    connection?: Connection,
    tabId?: number,
    arrayMode?: boolean,
    multiple: boolean,
    statements: IdentifyResult[]
  }): Promise<SnowflakeResult | SnowflakeResult[]> {
    log.info('RUNNING QUERY (using ident statements): ', q)
    const hasReserved = this.reservedConnections.has(options?.tabId);
    let conn: Connection = null

    if (hasReserved) {
      conn = this.peekConnection(options?.tabId);
    } else if (options?.connection) {
      conn = options?.connection;
    } else {
      conn = await this.pool.acquire();
    }

    const queries: string[] = [];

    for (const statement of options?.statements) {
      const result = await this.runToStatement(statement.text, {
        params: options.params,
        connection: conn,
        arrayMode: options.arrayMode,
      });

      const queryId = await result.queryId;
      queries.push(queryId);
    }

    const results = await Promise.all(queries.map(async (queryId) => {
      return await this.getQueryResultFromId<SnowflakeResult>(queryId, conn, options.arrayMode, (stmt, rows) => {
        const columns = stmt.getColumns()?.map((v) => ({
          name: v.getName(),
          type: v.getType()
        })) ?? [];

        const result: SnowflakeResult = {
          columns,
          rows,
          arrayMode: options.arrayMode,
          rowCount: stmt.getNumRows(),
          affectedCount: stmt.getNumUpdatedRows()
        };
        return result;
      })
    }))

    if (!hasReserved && !options?.connection) {
      this.pool.release(conn);
    }

    return results;
  }

  async reserveConnection(tabId: number) {
    this.throwIfHasConnection(tabId);

    if (this.reservedConnections.size >= BksConfig.db.snowflake.maxReservedConnections) {
      throw new Error(errorMessages.maxReservedConnections);
    }

    const conn = await this.pool.acquire();
    this.pushConnection(tabId, conn);
  }

  async releaseConnection(tabId: number) {
    const conn = this.popConnection(tabId);
    if (conn) {
      await this.pool.release(conn);
    }
  }

  async startTransaction(tabId: number) {
    const conn = this.peekConnection(tabId);
    await this.driverExecuteSingle('BEGIN TRANSACTION;', { connection: conn });
  }

  async commitTransaction(tabId: number) {
    const conn = this.peekConnection(tabId);
    await this.driverExecuteSingle('COMMIT;', { connection: conn });
  }

  async rollbackTransaction(tabId: number) {
    const conn = this.peekConnection(tabId);
    await this.driverExecuteSingle('ROLLBACK;', { connection: conn });
  }

  wrapIdentifier(value: string): string {
    if (!value || value === '*') return value;
    return `"${value.replaceAll(/"/g, '""')}"`;
  }

  protected parseTableColumn(column: any): BksField {
    return {
      name: column.COLUMN_NAME,
      bksType: "UNKNOWN"
    }
  }

  private async insertRows(rawInserts: TableInsert[], connection: Connection) {
    await this.driverExecuteMultiple(buildInsertQueries(this.knex, rawInserts).join(";"), { connection });
  }

  private async updateValues(rawUpdates: TableUpdate[], connection: Connection): Promise<TableUpdateResult> {
    let results: TableUpdateResult[];

    await this.driverExecuteMultiple(buildUpdateQueries(this.knex, rawUpdates).join(";"), { connection });

    const data = await this.driverExecuteMultiple(buildSelectQueriesFromUpdates(this.knex, rawUpdates).join(";"), { connection });

    results = data.map((r) => r.rows[0]);

    return results;
  }

  private async deleteRows(deletes: TableDelete[], connection) {
    await this.driverExecuteMultiple(buildDeleteQueries(this.knex, deletes).join(";"), { connection });
  }

  // This is never used
  async getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    return []
  }

  protected wrapTable(table: string, schema: string = this._defaultSchema) {
    if (!schema) return this.wrapIdentifier(table);
    return `${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)}`;
  }

  private async getSchema() {
    const sql = 'SELECT CURRENT_SCHEMA() AS schema';

    const data = await this.driverExecuteSingle(sql);
    return data.rows[0].schema;
  }
}
