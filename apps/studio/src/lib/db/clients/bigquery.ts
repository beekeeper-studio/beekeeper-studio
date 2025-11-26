import * as bq from '@google-cloud/bigquery';
import { TableKey } from "@shared/lib/dialects/models";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, CancelableQuery, NgQueryResult, DatabaseFilterOptions, TableChanges, TableProperties, PrimaryKeyColumn, OrderBy, TableFilter, TableResult, StreamResults, TableInsert, TableUpdate, TableDelete, BksField } from "../models";
import { DatabaseElement, IDbConnectionDatabase } from "../types";
import { BasicDatabaseClient, ExecutionContext, QueryLogOptions } from "./BasicDatabaseClient";
import knexlib from 'knex';
import Client from 'knex/lib/client';
import { BigQueryClient as BigQueryKnexClient } from '@shared/lib/knex-bigquery';
import { BigQueryChangeBuilder } from "@shared/lib/sql/change_builder/BigQueryChangeBuilder";
import platformInfo from "@/common/platform_info";
import rawLog from '@bksLogger';
import { applyChangesSql, buildDeleteQueries, buildInsertQuery, buildSelectQueriesFromUpdates, buildSelectTopQuery, buildUpdateQueries, escapeString } from './utils';
import { createCancelablePromise } from '@/common/utils';
import { errors } from '@/lib/errors';
import { BigQueryCursor } from './bigquery/BigQueryCursor';
import { BigQueryData } from '@shared/lib/dialects/bigquery';
import { IDbConnectionServer } from '../backendTypes';
import _ from 'lodash';
const { wrapIdentifier } = BigQueryData;
const log = rawLog.scope('bigquery')

interface BigQueryResult {
  data: any,
  rows: any[],
  rowCount: number
  arrayMode: boolean
  columns: bq.SchemaField[]
}

const bigqueryContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null;
  }
}

export class BigQueryClient extends BasicDatabaseClient<BigQueryResult> {
  server: IDbConnectionServer;
  database: IDbConnectionDatabase;
  client: bq.BigQuery;
  config: any = {};

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, bigqueryContext, server, database);
  }

  async versionString(): Promise<string> {
    return null
  }

  getBuilder(table: string, database?: string): ChangeBuilderBase {
    return new BigQueryChangeBuilder(table, database);
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
      transactions: true,
      filterTypes: ['standard']
    };
  }

  async connect(): Promise<void> {
    await super.connect();

    this.config.host = this.server.config.host
    this.config.port = this.server.config.port

    // For BigQuery Only -- IAM authentication and credential exchange
    const bigQueryOptions = this.server.config.bigQueryOptions

    this.config.projectId = bigQueryOptions.projectId /* || this.server.config.projectId */
    this.config.keyFilename = bigQueryOptions.keyFilename
    // For testing purposes
    this.config.apiEndpoint = this.bigQueryEndpoint(this.server.config)

    log.debug("configDatabase config: ", this.config)


    this.knex = knexlib({
      client: BigQueryKnexClient as Client,
      connection: { ...this.config }
    });


    this.client = new bq.BigQuery(this.config);
  }

  async disconnect(): Promise<void> {
    await super.disconnect();
  }

  async listTables(_filter?: FilterOptions): Promise<TableOrView[]> {
    // Lists all tables in the dataset
    if (!this.db) {
      return [];
    }
    return await this.listTablesOrViews(this.db, 'TABLE');
  }

  async listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    // Lists all views in the dataset
    if (!this.db) {
      return [];
    }
    return await this.listTablesOrViews(this.db, 'VIEW');
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    return [];
  }

  async listMaterializedViewColumns(_table: string, _schema?: string): Promise<TableColumn[]> {
    return [];
  }

  async listTableColumns(table?: string, _schema?: string): Promise<ExtendedTableColumn[]> {
    // Lists all columns in a table
    const [metadata] = await this.client.dataset(this.db).table(table).getMetadata()
    const data = metadata.schema.fields.map((field) => ({
      columnName: field.name,
      dataType: field.type,
      bksField: this.parseTableColumn(field),
    }))
    return data
  }

  async listTableTriggers(_table: string, _schema?: string): Promise<TableTrigger[]> {
    return [];
  }

  async listTableIndexes(_table: string, _schema?: string): Promise<TableIndex[]> {
    return [];
  }

  async listSchemas(_filter?: SchemaFilterOptions): Promise<string[]> {
    return [];
  }

  async getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    return [];
  }

  async getOutgoingKeys(table: string, _schema?: string): Promise<TableKey[]> {
    // Query for foreign keys FROM this table (referencing other tables)
    const sql = `
      SELECT
        NULL as from_schema,
        f.table_name as from_table,
        f.column_name as from_column,
        NULL as to_schema,
        t.table_name as to_table,
        t.column_name as to_column,
        f.constraint_name,
        NULL as update_rule,
        NULL as delete_rule
      FROM
        ${this.wrapIdentifier(this.db)}.INFORMATION_SCHEMA.KEY_COLUMN_USAGE as f
      JOIN ${this.wrapIdentifier(this.db)}.INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE as t
      ON f.constraint_name = t.constraint_name
      JOIN ${this.wrapIdentifier(this.db)}.INFORMATION_SCHEMA.TABLE_CONSTRAINTS as con
      ON f.constraint_catalog = con.constraint_catalog
      AND f.constraint_schema = con.constraint_schema
      AND f.constraint_name = con.constraint_name
      WHERE f.table_schema = '${escapeString(this.db)}'
      AND f.table_name = '${escapeString(table)}'
      AND con.constraint_type = 'FOREIGN KEY'
    `;

    const data = await this.driverExecuteSingle(sql);

    return data.rows.map((row) => ({
      toTable: row.to_table,
      toSchema: row.to_schema,
      toColumn: row.to_column,
      fromTable: row.from_table,
      fromSchema: row.from_schema,
      fromColumn: row.from_column,
      constraintName: row.constraint_name,
      onUpdate: row.update_rule,
      onDelete: row.delete_rule,
      isComposite: false
    }));
  }

  async getIncomingKeys(table: string, _schema?: string): Promise<TableKey[]> {
    // Query for foreign keys TO this table (other tables referencing this table)
    const sql = `
      SELECT
        NULL as from_schema,
        f.table_name as from_table,
        f.column_name as from_column,
        NULL as to_schema,
        t.table_name as to_table,
        t.column_name as to_column,
        f.constraint_name,
        NULL as update_rule,
        NULL as delete_rule
      FROM
        ${this.wrapIdentifier(this.db)}.INFORMATION_SCHEMA.KEY_COLUMN_USAGE as f
      JOIN ${this.wrapIdentifier(this.db)}.INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE as t
      ON f.constraint_name = t.constraint_name
      JOIN ${this.wrapIdentifier(this.db)}.INFORMATION_SCHEMA.TABLE_CONSTRAINTS as con
      ON f.constraint_catalog = con.constraint_catalog
      AND f.constraint_schema = con.constraint_schema
      AND f.constraint_name = con.constraint_name
      WHERE f.table_schema = '${escapeString(this.db)}'
      AND t.table_name = '${escapeString(table)}'
      AND con.constraint_type = 'FOREIGN KEY'
    `;

    const result = await this.driverExecuteSingle(sql);

    return result.rows.map((row) => ({
      toTable: row.to_table,
      toSchema: row.to_schema,
      toColumn: row.to_column,
      fromTable: row.from_table,
      fromSchema: row.from_schema,
      fromColumn: row.from_column,
      constraintName: row.constraint_name,
      onUpdate: row.update_rule,
      onDelete: row.delete_rule,
      isComposite: false
    }));
  }

  async query(queryText: string, options: any = {}): Promise<CancelableQuery> {
    log.debug('bigQuery query: ' + queryText);
    let job = null;
    const cancelable = createCancelablePromise({
      ...errors.CANCELED_BY_USER,
      // eslint-disable-next-line
      // @ts-ignore
      sqlectronError: 'CANCELED_BY_USER',
    })

    return {
      execute: async () => {
        // Get a query job first
        const jobOptions = { query: queryText, ...options };
        [job] = await this.client.createQueryJob(jobOptions)
        log.debug("created job: ", job.id)

        if (options?.dryRun) {
          const metadata = job.metadata;
          return [this.parseDryRunMetadata(metadata)];
        }

        try {
          log.debug("wait for executeQuery job.id: ", job.id)
          const data = await Promise.race([
            cancelable.wait(),
            this.driverExecuteSingle(queryText, job),
          ])
          return _.isArray(data) ? data : [data];
        } catch (err) {
          log.error('executeQuery error: ', err)
          throw err
        }
      },
      cancel: async () => {
        if (!job) {
          throw new Error('Query not ready to be canceled')
        }
        try {
          const [jobCancelResponse] = await job.cancel()
          log.debug("query jobCancelResponse: ", jobCancelResponse)
          cancelable.cancel()
        } finally {
          cancelable.discard()
        }
      },
    }
  }

  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    // Support passing a single query string and an object with params
    // if (queryText instanceof String) {
    //   queryText = { query: queries }
    // }
    let job = options?.job;
    log.info("BIGQUERY, executing", queryText)
    if (!job) {
      [job] = await this.client.createQueryJob({query: queryText})
    }

    // Wait for the query to finish
    const results = await job.getQueryResults()
    return results.map((data) => this.parseRowQueryResult(data))
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    // Lists all datasets in current GCP project.
    const [datasets] = await this.client.getDatasets();
    const data = datasets.map((dataset) => dataset.id);
    return data;
  }

  async executeApplyChanges(changes: TableChanges): Promise<any[]> {
    let results = [];

    try {
      if (changes.inserts && changes.inserts.length > 0) {
        await this.insertRows(changes.inserts);
      }

      if (changes.updates && changes.updates.length > 0) {
        results = await this.updateValues(changes.updates);
      }

      if (changes.deletes && changes.deletes.length > 0) {
        await this.deleteRows(changes.deletes);
      }
    } catch (ex) {
      log.error("Query Exception: ", ex);

      throw ex;
    }

    return results;
  }

  async getQuerySelectTop(table: string, limit: number, _schema?: string): Promise<string> {
    return `SELECT * FROM ${wrapIdentifier(this.database.database)}.${wrapIdentifier(table)} LIMIT ${limit}`;
  }

  async getTableProperties(table: string, _schema?: string): Promise<TableProperties> {
    log.debug("getTableProperties: ", table)

    const [
      length,
      indexes,
      triggers, // BigQuery has no triggers
      relations
    ] = await Promise.all([
      this.getTableLength(table),
      null,
      null,
      this.getTableKeys(table)
    ])
    return {
      length, indexes, relations, triggers
    } as TableProperties
  }

  async getTableCreateScript(table: string, _schema?: string): Promise<string> {
    const sql = `
      SELECT CONCAT('CREATE TABLE ', '${this.db}.${table}', ' (',
                   STRING_AGG(column_definition, ', '),
                   IF(pk.constraint_name IS NOT NULL, CONCAT(', PRIMARY KEY (', STRING_AGG(pk.column_list), ')'), ''),
                   ')') AS createtable
      FROM (
        SELECT
          table_name,
          CONCAT(column_name, ' ', data_type,
                 IF(IS_NULLABLE = 'NO', ' NOT NULL', '')) AS column_definition
        FROM \`${this.config.projectId}.${this.db}.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = ${table}
      ) AS column_definitions
      LEFT JOIN (
        SELECT
          c.table_name,
          c.constraint_name,
          STRING_AGG(cu.column_name, ', ') AS column_list
        FROM \`${this.config.projectId}.${this.db}.INFORMATION_SCHEMA.TABLE_CONSTRAINTS\` c
        JOIN \`${this.config.projectId}.${this.db}.INFORMATION_SCHEMA.KEY_COLUMN_USAGE\` cu
        ON c.constraint_name = cu.constraint_name
        WHERE c.constraint_type = 'PRIMARY KEY'
        GROUP BY c.table_name, c.constraint_name
      ) AS pk
      ON column_definitions.table_name = pk.table_name
      GROUP BY table_name, pk.constraint_name
    `;

    const data = await this.driverExecuteSingle(sql);

    return data.rows.map((row) => row.createtable)[0];
  }

  async getViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    throw new Error("Method not implemented.");
  }

  async getRoutineCreateScript(_routine: string, _type: string, _schema?: string): Promise<string[]> {
    throw new Error("Method not implemented.");
  }

  async truncateAllTables(_schema?: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return [];
  }

  async getPrimaryKey(table: string, _schema?: string): Promise<string> {
    const keys = await this.getPrimaryKeys(table);
    return keys.length === 1 ? keys[0].columnName : null;
  }

  async getPrimaryKeys(table: string, _schema?: string): Promise<PrimaryKeyColumn[]> {
    const query = `
      SELECT
        use.column_name as column_name,
        use.ordinal_position as position
      FROM
        ${this.wrapIdentifier(this.db)}.INFORMATION_SCHEMA.KEY_COLUMN_USAGE as use
      JOIN ${this.wrapIdentifier(this.db)}.INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS con
      ON use.constraint_catalog = con.constraint_catalog
      AND use.constraint_schema = con.constraint_schema
      AND use.constraint_name = con.constraint_name
      WHERE use.table_schema = '${escapeString(this.db)}'
      AND use.table_name = '${escapeString(table)}'
      AND con.constraint_type = 'PRIMARY KEY'`;

    const data = await this.driverExecuteSingle(query);
    if (data.rows) {
      return data.rows.map((r) => ({
        columnName: r.column_name,
        position: r.position
      }));
    } else {
      return []
    }
  }

  async getTableLength(table: string, _schema?: string): Promise<number> {
    // Returns the number of rows in the table
    // TODO (@day): does this even work? It's what we were doing before lol
    const [metadata] = await this.client.dataset(this.database.database).table(table).getMetadata()
    return Number(metadata.numRows)
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], _schema?: string, selects?: string[]): Promise<TableResult> {
    const columns = await this.listTableColumns(table);
    const bqTable = this.db + "." + table;
    const { query, countQuery, params } = buildSelectTopQuery(bqTable, offset, limit, orderBy, filters, 'total', columns, selects);
    const queriesResult = await this.driverExecuteMultiple(query, { countQuery, params });
    const data = queriesResult[0];
    const rowCount = Number(data.rowCount);
    const fields = this.parseQueryResultColumns(data);
    const rows = await this.serializeQueryResult(data, fields);

    const result = {
      totalRows: rowCount,
      result: rows,
      fields
    };
    return result;
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], _schema?: string, selects?: string[]): Promise<string> {
    const columns = await this.listTableColumns(table);
    const bqTable = this.db + "." + table;
    const queries = buildSelectTopQuery(bqTable, offset, limit, orderBy, filters, 'total', columns, selects);
    return queries.query;
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, _schema?: string): Promise<StreamResults> {
    const bqTable = this.db + "." + table;
    const qs = buildSelectTopQuery(bqTable, null, null, orderBy, filters);
    const columns = await this.listTableColumns(table);
    const rowCount = await this.getTableLength(table);
    const { query, params } = qs;

    return {
      totalRows: rowCount,
      columns,
      cursor: new BigQueryCursor(this.client, query, params, chunkSize)
    };
  }

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    const theCursor = new BigQueryCursor(this.client, query, [], chunkSize);
    const { columns, totalRows } = await this.getColumnsAndTotalRows(query)
    log.debug('results', theCursor);

    return {
      totalRows,
      columns,
      cursor: theCursor
    };
  }

  wrapIdentifier(value: string): string {
    return wrapIdentifier(value);
  }

  async setTableDescription(_table: string, _description: string, _schema?: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async setElementNameSql(_elementName: string, _newElementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    return ''
  }

  async dropElement(_elementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async truncateElementSql(): Promise<string> {
    return ''
  }

  async duplicateTable(_tableName: string, _duplicateTableName: string, _schema?: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async duplicateTableSql(_tableName: string, _duplicateTableName: string, _schema?: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async listCharsets(): Promise<string[]> {
    return [];
  }

  async getDefaultCharset(): Promise<string> {
    return null;
  }

  async listCollations(_charset: string): Promise<string[]> {
    return [];
  }

  async createDatabase(databaseName: string, _charset: string, _collation: string): Promise<string> {
    // Create a new dataset/database
    const options = {}
    const [dataset] = await this.client.createDataset(databaseName, options);
    log.debug(`Dataset ${dataset.id} created.`);
    return databaseName;
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<BigQueryResult | BigQueryResult[]> {
    log.info("BIGQUERY, executing", q);
    let job: bq.Job = options?.job;
    const queryArgs = {query: q, ...options };
    if (!job) {
      [job] = await this.client.createQueryJob(queryArgs);
    }

    // Wait for the query to finish
    const results = await job.getQueryResults();
    return results.map((data) => {
      const parsed = this.parseRowQueryResult(data)
      return {
        ...parsed,
        arrayMode: false,
        data: parsed.rows,
        columns: parsed.fields,
      }
    })
  }

  private bigQueryEndpoint(config: any) {
    if (platformInfo.isDevelopment && config.bigQueryOptions?.devMode) {
      return `http://${config.host}:${config.port}`
    }
    return undefined
  }

  private async listTablesOrViews(db: string, type: string) {
    // Lists all tables or views in the dataset
    const [tables] = await this.client.dataset(db).getTables();
    let data = tables.map((table) => ({ name: table.id, entityType: table.metadata.type }));
    data = data.filter((table) => table.entityType === type);
    log.debug(`listTablesOrViews for type:${type} data: `, data);
    return data;
  }

  // wtf typescript
  // eslint-disable-next-line
  // @ts-ignore
  private parseDryRunMetadata(metadata) {
    const queryStatistics = metadata.statistics.query;
    // bytes -> TiB * bq price per TiB processed
    const onDemandPricingEstimateUSD = queryStatistics.totalBytesBilled / (1024 ^ 4) * 6.25;
    const fields = [
      { name: 'statementType', id: 'statementType' },
      { name: 'totalBytesBilled', id: 'totalBytesBilled' },
      { name: 'totalBytesProcessed', id: 'totalBytesProcessed' },
      { name: 'totalBytesProcessedAccuracy', id: 'totalBytesProcessedAccuracy' },
      { name: 'onDemandPricingEstimateUSD', id: 'onDemandPricingEstimateUSD' }
    ];
    const rows = [
      {
        statementType: queryStatistics.statementType,
        totalBytesBilled: queryStatistics.totalBytesBilled,
        totalBytesProcessed: queryStatistics.totalBytesProcessed,
        totalBytesProcessedAccuracy: queryStatistics.totalBytesProcessedAccuracy,
        onDemandPricingEstimateUSD
      }
    ];

    return {
      command: 'SELECT',
      rows,
      fields,
      rowCount: 1,
      affectedRows: 0
    };
  }

  private parseRowQueryResult(data) {
    // Fallback in case the identifier could not reconize the command
    const isSelect = Array.isArray(data)
    const rows = this.parseRowData(data) || []
    const fields = Object.keys(rows[0] || {}).map((name) => ({ name, id: name }))
    log.debug("parseRowQueryResult data length: ", data.length)

    return {
      command: isSelect ? 'SELECT' : 'UNKNOWN',
      rows,
      fields: fields,
      rowCount: data && data.length,
      affectedRows: 0,
    }
  }

  private parseRowData(data) {
    // BigQuery can return nested objects with custom types in the results
    // look for the value string property.
    // https://github.com/googleapis/nodejs-bigquery/blob/71dbed2140893677f7af254f5a7713a7f50bae92/src/bigquery.ts#L2191
    return data.map((row) => {
      const parsedRow = {}
      Object.keys(row).forEach((key) => {
        let strValue = row[key]
        if (strValue != null && (Object.prototype.hasOwnProperty.call(strValue, 'value'))) {
          strValue = row[key].value
        }
        parsedRow[key] = strValue
      })
      return parsedRow
    })
  }

  private async insertRows(inserts: TableInsert[]) {
    for (const insert of inserts) {
      const columns = await this.listTableColumns(insert.table);
      const command = buildInsertQuery(this.knex, insert, { columns });
      await this.driverExecuteSingle(command);
    }

    return true;
  }

  private async updateValues(updates: TableUpdate[]) {
    log.info("applying updates", updates);
    let results = [];
    await this.driverExecuteSingle(buildUpdateQueries(this.knex, updates).join(";"));
    const data = await this.driverExecuteMultiple(buildSelectQueriesFromUpdates(this.knex, updates).join(":"))[0];
    results = [data.rows[0]];

    return results;
  }

  private async deleteRows(deletes: TableDelete[]) {
    for (const command of buildDeleteQueries(this.knex, deletes)) {
      await this.driverExecuteSingle(command);
    }

    return true;
  }

  parseTableColumn(column: any): BksField {
    return { name: column.name, bksType: 'UNKNOWN' }
  }
}
