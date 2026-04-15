// Copyright (c) 2015 The SQLECTRON Team
import { readFileSync } from 'fs';
import { parse as bytesParse } from 'bytes'
import sql, { ConnectionError, ConnectionPool, IColumnMetadata, IRecordSet, Request, Transaction } from 'mssql'
import { identify, StatementType } from 'sql-query-identifier'
import knexlib from 'knex'
import BksConfig from "@/common/bksConfig";
import _ from 'lodash'

import { DatabaseElement, IDbConnectionDatabase } from "../types"
import {
  buildDatabaseFilter,
  buildDeleteQueries,
  buildSchemaFilter,
  buildSelectQueriesFromUpdates,
  buildUpdateQueries,
  escapeString,
  joinQueries,
  buildInsertQuery,
  getEntraOptions,
  errorMessages
} from './utils';
import logRaw from '@bksLogger'
import { SqlServerCursor } from './sqlserver/SqlServerCursor'
import { SqlServerData } from '@shared/lib/dialects/sqlserver'
import { SqlServerChangeBuilder } from '@shared/lib/sql/change_builder/SqlServerChangeBuilder'
import { joinFilters } from '@/common/utils';
import {
  BasicDatabaseClient,
  ExecutionContext,
  QueryLogOptions
} from './BasicDatabaseClient'
import { FilterOptions, OrderBy, TableFilter, ExtendedTableColumn, TableIndex, TableProperties, TableResult, StreamResults, Routine, TableOrView, NgQueryResult, DatabaseFilterOptions, TableChanges, ImportFuncOptions, DatabaseEntity, BksFieldType, BksField } from '../models';
import { AlterTableSpec, IndexAlterations, RelationAlterations } from '@shared/lib/dialects/models';
import { AuthOptions, AzureAuthService } from '../authentication/azure';
import { IDbConnectionServer } from '../backendTypes';
import { GenericBinaryTranscoder } from '../serialization/transcoders';
const log = logRaw.scope('sql-server')

const D = SqlServerData
const mmsqlErrors = {
  CANCELED: 'ECANCEL',
};

type SQLServerVersion = {
  supportOffsetFetch: boolean
  releaseYear: number
  versionString: any
}

type ColumnMetadata = sql.IColumnMetadata[number]

type SQLServerResult = {
  connection: Request,
  data: sql.IResult<any>,
  // Number of changes made by the query
  rowsAffected: number
  rows: Record<string, any>[];
  columns: ColumnMetadata[];
  arrayMode: boolean;
}

interface ExecuteOptions {
  arrayRowMode?: boolean
  connection?: Request
}

const SQLServerContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null;
  }
}

const knex = knexlib({ client: 'mssql' });
const escapeBinding = knex.client._escapeBinding
knex.client._escapeBinding = function (value: any, context: any) {
  if (Buffer.isBuffer(value)) {
    return `0x${value.toString('hex')}`
  }
  return escapeBinding.call(this, value, context)
}

// NOTE:
// DO NOT USE CONCAT() in sql, not compatible with Sql Server <= 2008
// SQL Server < 2012 might eventually need its own class.
export class SQLServerClient extends BasicDatabaseClient<SQLServerResult, Transaction> {
  server: IDbConnectionServer
  database: IDbConnectionDatabase
  defaultSchema: () => Promise<string>
  version: SQLServerVersion
  dbConfig: any
  readOnlyMode: boolean
  logger: any
  pool: ConnectionPool;
  authService: AzureAuthService;
  transcoders = [GenericBinaryTranscoder];

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, SQLServerContext, server, database)
    this.dialect = 'mssql';
    this.readOnlyMode = server?.config?.readOnlyMode || false;
    this.defaultSchema = async (): Promise<string> => 'dbo'
    this.logger = () => log
    this.createUpsertFunc = this.createUpsertSQL
  }

  async getVersion(): Promise<SQLServerVersion> {
    const result = await this.executeQuery("SELECT @@VERSION as version")
    const versionString = result[0]?.rows[0]?.version
    const yearRegex = /SQL Server (\d+)/g
    const yearResults = yearRegex.exec(versionString)
    const releaseYear = (yearResults && _.toNumber(yearResults[1])) || 2017
    return {
      supportOffsetFetch: releaseYear >= 2012,
      releaseYear,
      versionString
    }
  }

  async listTables(filter: FilterOptions): Promise<TableOrView[]> {
    const schemaFilter = buildSchemaFilter(filter, 'table_schema');
    const sql = `
      SELECT
        table_schema,
        table_name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE table_type NOT LIKE '%VIEW%'
      ${schemaFilter ? `AND ${schemaFilter}` : ''}
      ORDER BY table_schema, table_name
    `;

    const { data } = await this.driverExecuteSingle(sql);

    return data.recordset.map((item) => ({
      schema: item.table_schema,
      name: item.table_name,
      entityType: 'table'
    }))
  }

  async listTableColumns(table: string, schema: string): Promise<ExtendedTableColumn[]> {
    const clauses = []
    if (table) clauses.push(`table_name = ${D.escapeString(table, true)}`)
    if (schema) clauses.push(`table_schema = ${D.escapeString(schema, true)}`)
    const clause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ''
    const sql = `
      SELECT
        table_schema as "table_schema",
        table_name as "table_name",
        column_name as "column_name",
        ordinal_position as "ordinal_position",
        column_default as "column_default",
        ic.is_nullable as "is_nullable",
        CASE
          WHEN sc.definition is not null THEN 'YES'
          ELSE 'NO'
        END as "is_generated",
        CASE
          WHEN character_maximum_length is not null AND data_type != 'text'
              THEN data_type + '(' + CAST(character_maximum_length AS VARCHAR(16)) + ')'
          WHEN numeric_precision is not null
              THEN data_type + '(' + CAST(numeric_precision AS VARCHAR(16)) + ')'
          WHEN datetime_precision is not null AND data_type != 'date'
              THEN data_type + '(' + CAST(datetime_precision AS VARCHAR(16)) + ')'
          ELSE data_type
        END as "data_type"
      FROM INFORMATION_SCHEMA.COLUMNS ic
      LEFT JOIN sys.computed_columns sc ON
        OBJECT_ID(QUOTENAME(ic.TABLE_SCHEMA) + '.' + QUOTENAME(ic.TABLE_NAME)) = sc.object_id AND
        ic.COLUMN_NAME = sc.name
      ${clause}
      ORDER BY table_schema, table_name, ordinal_position
    `

    const { data } = await this.driverExecuteSingle(sql)

    return data.recordset.map((row) => ({
      schemaName: row.table_schema,
      tableName: row.table_name,
      columnName: row.column_name,
      dataType: row.data_type,
      ordinalPosition: Number(row.ordinal_position),
      hasDefault: !_.isNil(row.column_default),
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      generated: row.is_generated === 'YES',
      bksField: this.parseTableColumn(row),
    }))
  }

  async versionString(): Promise<string> {
    return this.version.versionString.split(" \n\t")[0]
  }

  async executeQuery(queryText: string, options: ExecuteOptions = {}) {
    // NOTE (@day): we were apparently not even setting multiple on the request, so this is gonna be single for now
    const { data, rowsAffected } = await this.driverExecuteSingle(queryText, options);

    const commands = this.identifyCommands(queryText).map((item) => item.type)

    // Executing only non select queries will not return results.
    // So we "fake" there is at least one result.
    const results = !data.recordsets.length && rowsAffected > 0 ? [[] as any] : data.recordsets as IRecordSet<any>

    return results.map((result, idx) => this.parseRowQueryResult(result, rowsAffected, commands[idx], result?.columns, options.arrayRowMode))
  }

  async query(queryText: string, tabId: number) {
    const hasReserved = this.reservedConnections.has(tabId);
    const queryRequest: Request = hasReserved ? this.reservedConnections.get(tabId).request() : this.pool.request();
    log.info("HAS RESERVED: ", hasReserved, "For query: ", queryText)
    return {
      execute: async(): Promise<NgQueryResult[]> => {
        try {
          return await this.executeQuery(queryText, { arrayRowMode: true, connection: queryRequest })
        } catch (err) {
          if (err.code === mmsqlErrors.CANCELED) {
            err.sqlectronError = 'CANCELED_BY_USER';
          }

          throw err;
        }
      },
      async cancel() {
        if (!queryRequest) {
          throw new Error('Query not ready to be canceled')
        }

        queryRequest.cancel()
      },
    }
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects = ['*']): Promise<TableResult> {
    this.logger().debug("filters", filters)
    const query = await this.selectTopSql(table, offset, limit, orderBy, filters, schema, selects)
    this.logger().debug(query)

    const result = await this.driverExecuteSingle(query)
    this.logger().debug(result)
    const fields = this.parseQueryResultColumns(result)
    const rows = await this.serializeQueryResult(result, fields)
    return { result: rows, fields }
  }

  async selectTopSql(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    schema?: string,
    selects?: string[]
  ) {
    return this.version.supportOffsetFetch
      ? this.genSelectNew(table, offset, limit, orderBy, filters, schema, selects)
      : this.genSelectOld(table, offset, limit, orderBy, filters, schema, selects);
  }

  async listTableTriggers(table: string, schema: string) {
    // SQL Server does not have information_schema for triggers, so other way around
    // is using sp_helptrigger stored procedure to fetch triggers related to table
    const sql = `EXEC sp_helptrigger '${escapeString(schema)}.${escapeString(table)}'`;

    const { data } = await this.driverExecuteSingle(sql, { overrideReadonly: true });

    return data.recordset.map((row) => {
      const update = row.isupdate === 1 ? 'UPDATE' : null
      const del = row.isdelete === 1 ? 'DELETE': null
      const insert = row.isinsert === 1 ? 'INSERT' : null
      const instead = row.isinsteadof === 1 ? 'INSEAD_OF' : null

      const manips = [update, del, insert, instead].filter((f) => f).join(", ")

      return {
        name: row.trigger_name,
        timing: row.isafter === 1 ? 'AFTER' : 'BEFORE',
        manipulation: manips,
        action: null,
        condition: null,
        table, schema
      }
    })
  }

  async getPrimaryKeys(table: string, schema?: string) {
    this.logger().debug('finding foreign key for', table)
    const sql = `
    SELECT COLUMN_NAME, ORDINAL_POSITION
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + QUOTENAME(CONSTRAINT_NAME)), 'IsPrimaryKey') = 1
    AND TABLE_NAME = ${this.wrapValue(table)} AND TABLE_SCHEMA = ${this.wrapValue(schema)}
    `
    const { data } = await this.driverExecuteSingle(sql)
    if (!data.recordset || data.recordset.length === 0) return []

    return data.recordset.map((r) => ({
      columnName: r.COLUMN_NAME,
      position: r.ORDINAL_POSITION
    }))
  }

  async getPrimaryKey(table: string, schema: string) {
    const res = await this.getPrimaryKeys(table, schema)
    return res.length === 1 ? res[0].columnName : null
  }

  async listTableIndexes(table: string, schema: string = null): Promise<TableIndex[]> {
    schema = schema ?? await this.defaultSchema();
    const sql = `
      SELECT

      t.name as table_name,
      s.name as schema_name,
      ind.name as index_name,
      ind.index_id as index_id,
      ic.index_column_id as column_id,
      col.name as column_name,
      ic.is_descending_key as is_descending,
      ind.is_unique as is_unique,
      ind.is_primary_key as is_primary

      FROM
          sys.indexes ind
      INNER JOIN
          sys.index_columns ic ON  ind.object_id = ic.object_id and ind.index_id = ic.index_id
      INNER JOIN
          sys.columns col ON ic.object_id = col.object_id and ic.column_id = col.column_id
      INNER JOIN
          sys.tables t ON ind.object_id = t.object_id
      INNER JOIN
          sys.schemas s on t.schema_id = s.schema_id
      WHERE
          ind.is_unique_constraint = 0
          AND t.is_ms_shipped = 0
          AND t.name = '${escapeString(table)}'
          AND s.name = '${escapeString(schema)}'
      ORDER BY
          t.name, ind.name, ind.index_id, ic.is_included_column, ic.key_ordinal;
    `

    const { data } = await this.driverExecuteSingle(sql)

    const grouped = _.groupBy(data.recordset, 'index_name')

    const result = Object.keys(grouped).map((indexName) => {
      const blob = grouped[indexName]
      const unique = blob[0].is_unique
      const id = blob[0].index_id
      const primary = blob[0].is_primary
      const columns = _.sortBy(blob, 'column_id').map((column) => {
        return {
          name: column.column_name,
          order: column.is_descending ? 'DESC' : 'ASC'
        }
      })
      return {
        table, schema, id, name: indexName, unique, primary, columns
      }
    })

    return _.sortBy(result, 'id') as TableIndex[]
  }

  async getTableProperties(table: string, schema: string = null): Promise<TableProperties> {
    schema = schema ?? await this.defaultSchema();
    const triggers = await this.listTableTriggers(table, schema)
    const indexes = await this.listTableIndexes(table, schema)
    const description = await this.getTableDescription(table, schema)
    const sizeQuery = `EXEC sp_spaceused N'${escapeString(schema)}.${escapeString(table)}'; `
    const { data }  = await this.driverExecuteSingle(sizeQuery, { overrideReadonly: true })
    const row = data.recordset ? data.recordset[0] || {} : {}
    const relations = await this.getTableKeys(table, schema)
    return {
      size: bytesParse(row.data),
      indexSize: bytesParse(row.index_size),
      triggers,
      indexes,
      description,
      relations
    }
  }

  async getOutgoingKeys(table: string, schema?: string) {
    // Simplified approach to get foreign keys with ordinal position for proper ordering in composite keys
    const sql = `
      SELECT
        name = FK.CONSTRAINT_NAME,
        from_schema = PK.TABLE_SCHEMA,
        from_table = FK.TABLE_NAME,
        from_column = CU.COLUMN_NAME,
        to_schema = PK.TABLE_SCHEMA,
        to_table = PK.TABLE_NAME,
        to_column = PT.COLUMN_NAME,
        constraint_name = C.CONSTRAINT_NAME,
        on_update = C.UPDATE_RULE,
        on_delete = C.DELETE_RULE,
        CU.ORDINAL_POSITION as ordinal_position
      FROM
          INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS C
      INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS FK
          ON C.CONSTRAINT_NAME = FK.CONSTRAINT_NAME
      INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS PK
          ON C.UNIQUE_CONSTRAINT_NAME = PK.CONSTRAINT_NAME
      INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE CU
          ON C.CONSTRAINT_NAME = CU.CONSTRAINT_NAME
      INNER JOIN (
                  SELECT
                      i1.TABLE_NAME,
                      i2.COLUMN_NAME
                  FROM
                      INFORMATION_SCHEMA.TABLE_CONSTRAINTS i1
                  INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE i2
                      ON i1.CONSTRAINT_NAME = i2.CONSTRAINT_NAME
                  WHERE
                      i1.CONSTRAINT_TYPE = 'PRIMARY KEY'
                ) PT
          ON PT.TABLE_NAME = PK.TABLE_NAME
      WHERE FK.TABLE_NAME = ${this.wrapValue(table)} AND FK.TABLE_SCHEMA = ${this.wrapValue(schema)}
      ORDER BY
        FK.CONSTRAINT_NAME,
        CU.ORDINAL_POSITION
    `;

    const { data } = await this.driverExecuteSingle(sql);

    // Group by constraint name to identify composite keys
    const groupedKeys = _.groupBy(data.recordset, 'name');

    const result = Object.keys(groupedKeys).map(constraintName => {
      const keyParts = groupedKeys[constraintName];

      // If there's only one part, return a simple key (backward compatibility)
      if (keyParts.length === 1) {
        const row = keyParts[0];
        return {
          constraintName: row.name,
          toTable: row.to_table,
          toSchema: row.to_schema,
          toColumn: row.to_column,
          fromTable: row.from_table,
          fromSchema: row.from_schema,
          fromColumn: row.from_column,
          onUpdate: row.on_update,
          onDelete: row.on_delete,
          isComposite: false
        };
      }

      // If there are multiple parts, it's a composite key
      const firstPart = keyParts[0];
      return {
        constraintName: firstPart.name,
        toTable: firstPart.to_table,
        toSchema: firstPart.to_schema,
        toColumn: keyParts.map(p => p.to_column),
        fromTable: firstPart.from_table,
        fromSchema: firstPart.from_schema,
        fromColumn: keyParts.map(p => p.from_column),
        onUpdate: firstPart.on_update,
        onDelete: firstPart.on_delete,
        isComposite: true
      };
    });

    this.logger().debug("outgoingKeys result", result);
    return result;
  }

  async getIncomingKeys(table: string, schema?: string) {
    // Query for foreign keys TO this table (incoming - other tables referencing this table)
    const sql = `
      SELECT
        name = FK.CONSTRAINT_NAME,
        from_schema = FK.TABLE_SCHEMA,
        from_table = FK.TABLE_NAME,
        from_column = CU.COLUMN_NAME,
        to_schema = PK.TABLE_SCHEMA,
        to_table = PK.TABLE_NAME,
        to_column = PT.COLUMN_NAME,
        constraint_name = C.CONSTRAINT_NAME,
        on_update = C.UPDATE_RULE,
        on_delete = C.DELETE_RULE,
        CU.ORDINAL_POSITION as ordinal_position
      FROM
          INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS C
      INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS FK
          ON C.CONSTRAINT_NAME = FK.CONSTRAINT_NAME
      INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS PK
          ON C.UNIQUE_CONSTRAINT_NAME = PK.CONSTRAINT_NAME
      INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE CU
          ON C.CONSTRAINT_NAME = CU.CONSTRAINT_NAME
      INNER JOIN (
                  SELECT
                      i1.TABLE_NAME,
                      i2.COLUMN_NAME,
                      i2.ORDINAL_POSITION
                  FROM
                      INFORMATION_SCHEMA.TABLE_CONSTRAINTS i1
                  INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE i2
                      ON i1.CONSTRAINT_NAME = i2.CONSTRAINT_NAME
                  WHERE
                      i1.CONSTRAINT_TYPE = 'PRIMARY KEY'
                ) PT
          ON PT.TABLE_NAME = PK.TABLE_NAME AND CU.ORDINAL_POSITION = PT.ORDINAL_POSITION
      WHERE PK.TABLE_NAME = ${this.wrapValue(table)} AND PK.TABLE_SCHEMA = ${this.wrapValue(schema)}
      ORDER BY
        FK.CONSTRAINT_NAME,
        CU.ORDINAL_POSITION
    `;

    const { data } = await this.driverExecuteSingle(sql);
    const recordset = data.recordset || [];

    // Group by constraint name to identify composite keys
    const groupedKeys = _.groupBy(recordset, 'name');

    const result = Object.keys(groupedKeys).map(constraintName => {
      const keyParts = groupedKeys[constraintName];

      // If there's only one part, return a simple key (backward compatibility)
      if (keyParts.length === 1) {
        const row = keyParts[0];
        return {
          constraintName: row.name,
          toTable: row.to_table,
          toSchema: row.to_schema,
          toColumn: row.to_column,
          fromTable: row.from_table,
          fromSchema: row.from_schema,
          fromColumn: row.from_column,
          onUpdate: row.on_update,
          onDelete: row.on_delete,
          isComposite: false
        };
      }

      // If there are multiple parts, it's a composite key
      const firstPart = keyParts[0];
      return {
        constraintName: firstPart.name,
        toTable: firstPart.to_table,
        toSchema: firstPart.to_schema,
        toColumn: keyParts.map(p => p.to_column),
        fromTable: firstPart.from_table,
        fromSchema: firstPart.from_schema,
        fromColumn: keyParts.map(p => p.from_column),
        onUpdate: firstPart.on_update,
        onDelete: firstPart.on_delete,
        isComposite: true
      };
    });

    this.logger().debug("incomingKeys result", result);
    return result;
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema: string, selects = ['*']) {
    const query = this.genSelectNew(table, null, null, orderBy, filters, schema, selects)
    const columns = await this.listTableColumns(table, schema)
    const rowCount = await this.getTableLength(table, schema)

    return {
      totalRows: Number(rowCount),
      columns,
      cursor: new SqlServerCursor(this.pool.request(), query, chunkSize)
    }
  }

  async getTableLength(table: string, schema: string) {
    const countQuery = this.genCountQuery(table, [], schema)
    const countResults = await this.driverExecuteSingle(countQuery)
    const rowWithTotal = countResults.data.recordset.find((row) => { return row.total })
    const totalRecords = rowWithTotal ? rowWithTotal.total : 0
    return totalRecords
  }

  async setElementNameSql(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema: string = null): Promise<string> {
    schema = schema ?? await this.defaultSchema();
    if (typeOfElement !== DatabaseElement.TABLE && typeOfElement !== DatabaseElement.VIEW) {
      return ''
    }

    elementName = this.wrapValue(schema + '.' + elementName)
    newElementName = this.wrapValue(newElementName)

    return `EXEC sp_rename ${elementName}, ${newElementName};`
  }

  async dropElement (elementName: string, typeOfElement: DatabaseElement, schema = 'dbo') {
    const sql = `DROP ${D.wrapLiteral(typeOfElement)} ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(elementName)}`
    await this.driverExecuteSingle(sql)
  }

  async listDatabases(filter: DatabaseFilterOptions) {
    const databaseFilter = buildDatabaseFilter(filter, 'name');
    const sql = `
      SELECT name
      FROM sys.databases
      ${databaseFilter ? `AND ${databaseFilter}` : ''}
      ORDER BY name
    `

    const { data } = await this.driverExecuteSingle(sql)

    return data.recordset.map((row) => row.name)
  }

  createUpsertSQL({ schema, name: tableName }: DatabaseEntity, data: {[key: string]: any}, primaryKeys: string[]): string {
    const [PK] = primaryKeys
    const columnsWithoutPK = _.without(Object.keys(data[0]), PK)
    const columns = `([${PK}], ${columnsWithoutPK.map(cpk => `[${cpk}]`).join(', ')})`
    const insertSQL = () => `
      INSERT ${columns}
      VALUES (source.[${PK}], ${columnsWithoutPK.map(cpk => `source.[${cpk}]`).join(', ')})
    `
    const updateSet = () => `${columnsWithoutPK.map(cpk => `target.[${cpk}] = source.[${cpk}]`).join(', ')}`
    const formatValue = (val) => _.isString(val) ? `'${val}'` : val
    const usingSQLStatement = data.map( (val) =>
      `(${formatValue(val[PK])}, ${columnsWithoutPK.map(col => `${formatValue(val[col])}`).join(', ')})`
    ).join(', ')

    return `
      MERGE INTO [${schema}].[${tableName}] AS target
      USING (VALUES
        ${usingSQLStatement}
      ) AS source ${columns}
      ON target.${PK} = source.${PK}
      WHEN MATCHED THEN
        UPDATE SET
          ${updateSet()}
      WHEN NOT MATCHED THEN
        ${insertSQL()};
    `
  }

  /*
    From https://docs.microsoft.com/en-us/sql/t-sql/statements/create-database-transact-sql?view=sql-server-ver16&tabs=sqlpool:
    Collation name can be either a Windows collation name or a SQL collation name. If not specified, the database is assigned the default collation of the instance of SQL Server
    Having this, going to keep collations at the default because there are literally thousands of options
  */
  async createDatabase(databaseName: string) {
    const sql = `create database ${this.wrapIdentifier(databaseName)}`;
    await this.driverExecuteSingle(sql)
    return databaseName;
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  // ONLY USED FOR IMPORT
  protected async runWithConnection(child: (connection: Request) => Promise<any>):  Promise<any> {
    return await child(null);
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<SQLServerResult> {
    log.info('RUNNING', q, options);

    const runQuery = async (connection: Request) => {
      connection.arrayRowMode = options.arrayRowMode || false;
      const data = await connection.query(q)
      const rowsAffected = _.sum(data.rowsAffected)
      const columns = !data.recordset ? [] : Object.keys(data.recordset.columns).map((key) => data.recordset.columns[key])
      const rows = data.recordset
      const arrayMode = connection.arrayRowMode
      return { connection, data, rowsAffected, columns, rows, arrayMode }
    };

    return runQuery(options.connection ? options.connection : this.pool.request());
  }

  async truncateAllTables() {
    const schema = await this.getSchema()

    const sql = `
      SELECT table_name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE table_schema = '${schema}'
      AND table_type NOT LIKE '%VIEW%'
    `;

    const { data } = await this.driverExecuteSingle(sql);

    const truncateAll = data.recordset.map((row) => `
      DELETE FROM ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(row.table_name)}
      DBCC CHECKIDENT ('${schema}.${row.table_name}', RESEED, 0);
    `).join('');

    // NOTE (@day): we were apparently not even setting multiple on the request, so this is gonna be single for now
    await this.driverExecuteSingle(truncateAll);
  }

  async truncateElementSql(elementName: string, typeOfElement: DatabaseElement, schema = 'dbo') {
    return `TRUNCATE ${D.wrapLiteral(typeOfElement)} ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(elementName)}`
  }

  async duplicateTable(tableName: string, duplicateTableName: string, schema = 'dbo') {
    const sql = await this.duplicateTableSql(tableName, duplicateTableName, schema)

    await this.driverExecuteSingle(sql)
  }

  async duplicateTableSql(tableName: string, duplicateTableName: string, schema) {
    return `SELECT * INTO ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(duplicateTableName)} FROM ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(tableName)}`
  }

  async alterTableSql(changes:AlterTableSpec) {
    const { table, schema } = changes
    const columns = await this.listTableColumns(table, schema)
    const defaultConstraints = await this.listDefaultConstraints(table, schema)
    const builder = new SqlServerChangeBuilder(table, schema, columns, defaultConstraints)
    return builder.alterTable(changes)
  }

  async alterTable(changes: AlterTableSpec) {
    const query = await this.alterTableSql(changes)
    await this.executeWithTransaction(query)
  }

  async alterIndex(payload: IndexAlterations) {
    const sql = await this.alterIndexSql(payload)
    await this.executeWithTransaction(sql)
  }

  async executeApplyChanges(changes: TableChanges) {
    const results = []
    let sql = ['SET XACT_ABORT ON', 'BEGIN TRANSACTION']

    try {
      if (changes.inserts) {
        const columnsList = await Promise.all(changes.inserts.map((insert) => {
          return this.listTableColumns(insert.table, insert.schema);
        }));
        sql = sql.concat(changes.inserts.map((insert, index) => buildInsertQuery(this.knex, insert, { columns: columnsList[index] })))
      }

      if (changes.updates) {
        sql = sql.concat(buildUpdateQueries(this.knex, changes.updates))
      }

      if (changes.deletes) {
        sql = sql.concat(buildDeleteQueries(this.knex, changes.deletes))
      }

      sql.push('COMMIT')

      await this.driverExecuteSingle(sql.join(';'))

      if (changes.updates) {
        const selectQueries = buildSelectQueriesFromUpdates(this.knex, changes.updates)
        for (let index = 0; index < selectQueries.length; index++) {
          const element = selectQueries[index];
          const r = await this.driverExecuteSingle(element)
          if (r.data[0]) results.push(r.data[0])
        }
      }
    } catch (ex) {
      log.error("query exception: ", ex)
      throw ex
    }

    return results
  }

  async listMaterializedViewColumns() {
    return []
  }

  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    const schemaFilter = buildSchemaFilter(filter, 'table_schema');
    const sql = `
      SELECT
        table_schema,
        table_name
      FROM INFORMATION_SCHEMA.VIEWS
      ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
      ORDER BY table_schema, table_name
    `

    const { data } = await this.driverExecuteSingle(sql)

    return data.recordset.map((item) => ({
      schema: item.table_schema,
      name: item.table_name,
      entityType: 'view'
    }))
  }

  async listMaterializedViews() {
    // TODO: materialized views in SQL server
    return []
  }

  async listRoutines(filter?: FilterOptions): Promise<Routine[]> {
    const schemaFilter = buildSchemaFilter(filter, 'r.routine_schema');
    const sql = `
      SELECT
        r.specific_name as id,
        r.routine_schema as routine_schema,
        r.routine_name as name,
        r.routine_type as routine_type,
        r.data_type as data_type
      FROM INFORMATION_SCHEMA.ROUTINES r
      where r.routine_schema not in ('sys', 'information_schema',
                                  'mysql', 'performance_schema', 'INFORMATION_SCHEMA')
      ${schemaFilter ? `AND ${schemaFilter}` : ''}
      ORDER BY routine_schema, routine_name
    `;

    const paramsSQL = `
      select
          r.routine_schema as routine_schema,
          r.specific_name as specific_name,
          p.parameter_name as parameter_name,
          p.character_maximum_length as char_length,
          p.data_type as data_type
    from INFORMATION_SCHEMA.ROUTINES r
    left join INFORMATION_SCHEMA.PARAMETERS p
              on p.specific_schema = r.routine_schema
              and p.specific_name = r.specific_name
    where r.routine_schema not in ('sys', 'information_schema',
                                  'mysql', 'performance_schema', 'INFORMATION_SCHEMA')
      ${schemaFilter ? `AND ${schemaFilter}` : ''}

        AND p.parameter_mode = 'IN'
    order by r.routine_schema,
            r.specific_name,
            p.ordinal_position;

    `

    const { data } = await this.driverExecuteSingle(sql);
    const paramsResult = await this.driverExecuteSingle(paramsSQL)
    const grouped = _.groupBy(paramsResult.data.recordset, 'specific_name')

    return data.recordset.map((row) => {
      const params = grouped[row.id] || []
      return {
        schema: row.routine_schema,
        name: row.name,
        type: row.routine_type ? row.routine_type.toLowerCase() : 'function',
        returnType: row.data_type,
        id: row.id,
        entityType: 'routine',
        routineParams: params.map((p) => {
          return {
            name: p.parameter_name,
            type: p.data_type,
            length: p.char_length || undefined
          }
        })
      }
    })
  }

  async listSchemas(filter: FilterOptions) {
    const schemaFilter = buildSchemaFilter(filter);
    const sql = `
      SELECT schema_name
      FROM INFORMATION_SCHEMA.SCHEMATA
      ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
      ORDER BY schema_name
    `

    const { data } = await this.driverExecuteSingle(sql)

    return data.recordset.map((row) => row.schema_name)
  }

  async getTableReferences(table: string) {
    const sql = `
      SELECT OBJECT_NAME(referenced_object_id) referenced_table_name
      FROM sys.foreign_keys
      WHERE parent_object_id = OBJECT_ID('${table}')
    `

    const { data } = await this.driverExecuteSingle(sql)

    return data.recordset.map((row) => row.referenced_table_name)
  }

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    const { columns, totalRows } = await this.getColumnsAndTotalRows(query)
    return {
      totalRows,
      columns,
      cursor: new SqlServerCursor(this.pool.request(), query, chunkSize),
    }
  }

  async getQuerySelectTop(table: string, limit: number): Promise<string> {
    return `SELECT TOP ${limit} * FROM ${this.wrapIdentifier(table)}`;
  }

  async getTableCreateScript(table: string): Promise<string> {
    // Reference http://stackoverflow.com/a/317864
    const sql = `
      SELECT  ('CREATE TABLE ' + so.name + ' (' +
        CHAR(13)+CHAR(10) + REPLACE(o.list, '&#x0D;', CHAR(13)) +
        ')' + CHAR(13)+CHAR(10) +
        CASE WHEN tc.constraint_name IS NULL THEN ''
             ELSE + CHAR(13)+CHAR(10) + 'ALTER TABLE ' + so.Name +
             ' ADD CONSTRAINT ' + tc.constraint_name  +
             ' PRIMARY KEY ' + '(' + LEFT(j.list, Len(j.list)-1) + ')'
        END) AS createtable
      FROM sysobjects so
      CROSS APPLY
        (SELECT
          '  ' + column_name + ' ' +
          data_type +
          CASE data_type
              WHEN 'sql_variant' THEN ''
              WHEN 'text' THEN ''
              WHEN 'ntext' THEN ''
              WHEN 'xml' THEN ''
              WHEN 'decimal' THEN '(' + cast(numeric_precision AS varchar) + ', '
                    + cast(numeric_scale AS varchar) + ')'
              ELSE coalesce('('+ CASE WHEN character_maximum_length = -1
                    THEN 'MAX'
                    ELSE cast(character_maximum_length AS varchar)
                  END + ')','')
            END + ' ' +
            CASE WHEN EXISTS (
              SELECT id FROM syscolumns
              WHERE object_name(id)=so.name
              AND name=column_name
              AND columnproperty(id,name,'IsIdentity') = 1
            ) THEN
              'IDENTITY(' +
              cast(ident_seed(so.name) AS varchar) + ',' +
              cast(ident_incr(so.name) AS varchar) + ')'
            ELSE ''
            END + ' ' +
             (CASE WHEN UPPER(IS_NULLABLE) = 'NO'
                   THEN 'NOT '
                   ELSE ''
            END ) + 'NULL' +
            CASE WHEN INFORMATION_SCHEMA.COLUMNS.column_default IS NOT NULL
                 THEN ' DEFAULT '+ INFORMATION_SCHEMA.COLUMNS.column_default
                 ELSE ''
            END + ',' + CHAR(13)+CHAR(10)
         FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = so.name
         ORDER BY ordinal_position
         FOR XML PATH('')
      ) o (list)
      LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      ON  tc.table_name       = so.name
      AND tc.constraint_type  = 'PRIMARY KEY'
      CROSS APPLY
          (SELECT column_name + ', '
           FROM   INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
           WHERE  kcu.constraint_name = tc.constraint_name
           ORDER BY ordinal_position
           FOR XML PATH('')
          ) j (list)
      WHERE   xtype = 'U'
      AND name    NOT IN ('dtproperties')
      AND so.name = '${table}'
    `

    const { data } = await this.driverExecuteSingle(sql)

    return data.recordset.map((row) => row.createtable)[0]
  }

  async getViewCreateScript(view: string) {
    const sql = `SELECT OBJECT_DEFINITION (OBJECT_ID('${view}')) AS ViewDefinition;`;

    const { data } = await this.driverExecuteSingle(sql);

    return data.recordset.map((row) => row.ViewDefinition);
  }

  async getMaterializedViewCreateScripts() {
    return []
  }

  async getRoutineCreateScript(routine: string) {
    const sql = `
      SELECT definition
      FROM sys.sql_modules
      WHERE OBJECT_NAME(object_id) = '${routine}'
    `

    const { data } = await this.driverExecuteSingle(sql)

    return data.recordset.map((row) => row.definition)
  }

  async setTableDescription(table: string, desc: string, schema: string) {
    const existingDescription = await this.getTableDescription(table, schema)
    const f = existingDescription ? 'sp_updateextendedproperty' : 'sp_addextendedproperty'
    const sql = `
    EXEC ${f}
      @name = N'MS_Description',
      @value = N${D.escapeString(desc, true)},
      @level0type = N'SCHEMA', @level0name = ${D.wrapIdentifier(schema)},
      @level1type = N'TABLE',  @level1name = ${D.wrapIdentifier(table)};
    `
    await this.executeQuery(sql)
    return ''
  }

  async alterRelation(payload: RelationAlterations) {
    const query = await this.alterRelationSql(payload)
    await this.executeWithTransaction(query);
  }

  async hasIdentityColumn(table: TableOrView): Promise<boolean> {
    const sql = `
      SELECT
        c.name AS ColumnName,
        t.name AS TableName,
        s.name AS SchemaName,
        c.is_identity
      FROM sys.columns c
      JOIN sys.tables t ON c.object_id = t.object_id
      JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE t.name = ${this.wrapValue(table.name)}
      AND s.name = ${this.wrapValue(table.schema)}
      AND c.is_identity = 1;
    `;

    const { data } = await this.driverExecuteSingle(sql);
    return data.recordset && data.recordset.length > 0;
  }

  async importStepZero(table: TableOrView): Promise<any> {
    const transaction = new sql.Transaction(this.pool)

    return {
      transaction,
      request: new sql.Request(transaction),
      hasIdentityColumn: await this.hasIdentityColumn(table)
    }
  }

  async importBeginCommand(_table: TableOrView, { clientExtras }: ImportFuncOptions): Promise<any> {
    await clientExtras.transaction.begin()
  }

  async importTruncateCommand (table: TableOrView, { clientExtras, executeOptions }: ImportFuncOptions): Promise<any> {
    const { name, schema } = table
    const schemaString = schema ? `${this.wrapIdentifier(schema)}.` : ''
    await clientExtras.request.query(`TRUNCATE TABLE ${schemaString}${this.wrapIdentifier(name)};`, executeOptions)
  }

  async importLineReadCommand (table: TableOrView, sqlString: string, { executeOptions }: ImportFuncOptions): Promise<any> {
    const { name, schema } = table
    const schemaString = schema ? `${this.wrapIdentifier(schema)}.` : ''
    const identOn = executeOptions.hasIdentityColumn ? `SET IDENTITY_INSERT ${schemaString}${this.wrapIdentifier(name)} ON;` : '';
    const identOff = executeOptions.hasIdentityColumn ? `SET IDENTITY_INSERT ${schemaString}${this.wrapIdentifier(name)} OFF;` : '';
    const query = `${identOn}${sqlString};${identOff}`;
    return await executeOptions.request.query(query, executeOptions)
  }

  async importCommitCommand (_table: TableOrView, { clientExtras }: ImportFuncOptions): Promise<any> {
    return await clientExtras.transaction.commit()
  }

  async importRollbackCommand (_table: TableOrView, { clientExtras }: ImportFuncOptions): Promise<any> {
    return await clientExtras.transaction.rollback()
  }

  /* helper functions and settings below! */

  async connect(signal?: AbortSignal): Promise<void> {
    await super.connect();

    this.dbConfig = await this.configDatabase(this.server, this.database, signal)
    this.pool = await new ConnectionPool(this.dbConfig).connect();

    this.pool.on('error', (err) => {
      if (err instanceof ConnectionError) {
        log.error('Pool ConnectionError', err.message)
      }
      log.error("Pool event: connection error:", err.name, err.message);
    });


    this.logger().debug('create driver client for mmsql with config %j', this.dbConfig);
    this.version = await this.getVersion()
    return
  }

  async disconnect(): Promise<void> {
    await this.pool.close();

    await super.disconnect();
  }

  async listCharsets() {
    return []
  }

  getDefaultCharset() {
    return null
  }

  async listCollations() {
    return []
  }

  async supportedFeatures() {
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
      filterTypes: ['standard']
    }
  }

  async applyChangesSql(changes: TableChanges): Promise<string> {
    // fix for bit fields
    if (changes.inserts) {
      changes.inserts.forEach((insert) => {
        insert.data.forEach((item) => {
          const columns = Object.keys(item);
          columns.forEach((ic) => {
            if (_.isBoolean(item[ic])) {
              item[ic] = item[ic] ? 1 : 0
            }
          })
        })
      })
    }
    return super.applyChangesSql(changes)
  }

  wrapIdentifier(value: string) {
    return SqlServerData.wrapIdentifier(value)
  }

  getBuilder(table: string, schema?: string) {
    return new SqlServerChangeBuilder(table, schema, [], [])
  }

  async reserveConnection(tabId: number): Promise<void> {
    this.throwIfHasConnection(tabId);

    if (this.reservedConnections.size >= BksConfig.db.sqlserver.maxReservedConnections) {
      throw new Error(errorMessages.maxReservedConnections)
    }

    const conn = this.pool.transaction();
    this.pushConnection(tabId, conn);
  }

  async releaseConnection(tabId: number): Promise<void> {
    const conn = this.popConnection(tabId);
    if (conn) {
      try {
        // This may throw if the connection hasn't been begun yet, so just to be safe we'll catch
        await conn.rollback();
      } catch {}
    }
  }

  async startTransaction(tabId: number): Promise<void> {
    const conn = this.peekConnection(tabId);
    await conn.begin();
  }

  async commitTransaction(tabId: number): Promise<void> {
    const conn = this.popConnection(tabId);
    await conn.commit();
    // commit releases the connection annoyingly so we have to re reserve one
    await this.reserveConnection(tabId);
  }

  async rollbackTransaction(tabId: number): Promise<void> {
    const conn = this.popConnection(tabId);
    await conn.rollback();
    // rollback also releases the connection so we have to re reserve the connection
    await this.reserveConnection(tabId);
  }

  private async executeWithTransaction(q: string) {
    try {
      const query = joinQueries(['SET XACT_ABORT ON', 'BEGIN TRANSACTION', q, 'COMMIT'])
      await this.driverExecuteSingle(query)
    } catch (ex) {
      this.logger().error(ex)
      throw ex
    }
  }

  private parseFields(data: any[], columns: IColumnMetadata) {
    if (columns && _.isArray(columns)) {
      return columns.map((c, idx) => {
        return {
          id: `c${idx}`,
          name: c.name
        }
      })
    } else {
      return Object.keys(data[0] || {}).map((name) => ({ name, id: name }))
    }
  }

  private parseRowQueryResult(data: any[], rowsAffected: number, command: StatementType, columns: IColumnMetadata, arrayRowMode = false) {
    // Fallback in case the identifier could not reconize the command
    // eslint-disable-next-line
    const isSelect = !!(data.length || rowsAffected === 0)
    const fields = this.parseFields(data, columns)
    const fieldIds = fields.map(f => f.id)
    return {
      command: command || (isSelect && 'SELECT'),
      rows: arrayRowMode ? data.map(r => _.zipObject(fieldIds, r)) : data,
      fields: fields,
      rowCount: data.length,
      affectedRows: rowsAffected,
    }
  }

  private identifyCommands(queryText: string) {
    try {
      return identify(queryText);
    } catch (err) {
      return [];
    }
  }

  private async configDatabase(server: IDbConnectionServer, database: IDbConnectionDatabase, signal?: AbortSignal): Promise<any> { // changed to any for now, might need to make some changes
    const config: any = {
      server: server.config.host,
      database: database.database,
      requestTimeout: Infinity,
      appName: 'beekeeperstudio',
      pool: {
        max: BksConfig.db.sqlserver.maxConnections
      }
    };

    if (server.config.azureAuthOptions?.azureAuthEnabled) {
      this.authService = new AzureAuthService();
      await this.authService.init(server.config.authId)

      const options = getEntraOptions(server, { signal })

      config.authentication = await this.authService.auth(server.config.azureAuthOptions.azureAuthType, options);

      config.options = {
        encrypt: true
      };

      return config;
    }

    config.user = server.config.user;
    config.password = server.config.password;
    config.port = Number(server.config.port);

    if (server.config.domain) {
      config.domain = server.config.domain
    }

    if (server.sshTunnel) {
      config.server = server.config.localHost;
      config.port = server.config.localPort;
    }

    config.options = { trustServerCertificate: server.config.trustServerCertificate }

    if (server.config.ssl) {
      const options: any = {
        encrypt: server.config.ssl,
        cryptoCredentialsDetails: {}
      }

      if (server.config.sslCaFile) {
        options.cryptoCredentialsDetails.ca = readFileSync(server.config.sslCaFile);
      }

      if (server.config.sslCertFile) {
        options.cryptoCredentialsDetails.cert = readFileSync(server.config.sslCertFile);
      }

      if (server.config.sslKeyFile) {
        options.cryptoCredentialsDetails.key = readFileSync(server.config.sslKeyFile);
      }


      if (server.config.sslCaFile && server.config.sslCertFile && server.config.sslKeyFile) {
        // trust = !reject
        // mssql driver reverses this setting for no obvious reason
        // other drivers simply pass through to the SSL library.
        options.trustServerCertificate = !server.config.sslRejectUnauthorized
      }

      config.options = options;
    }

    return config;
  }

  private genSelectOld(table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    schema?: string,
    selects?: string[]
  ) {
    const selectString = selects.map((s) => this.wrapIdentifier(s)).join(", ")
    const orderByString = this.genOrderByString(orderBy)
    const filterString = _.isString(filters) ? `WHERE ${filters}` : this.buildFilterString(filters)
    const lastRow = offset + limit
    const schemaString = schema ? `${this.wrapIdentifier(schema)}.` : ''

    const query = `
      WITH CTE AS
      (
          SELECT ${selectString}
                , ROW_NUMBER() OVER (${orderByString}) as RowNumber
          FROM ${schemaString}${this.wrapIdentifier(table)}
          ${filterString}
      )
      SELECT *
            -- get the total records so the web layer can work out
            -- how many pages there are
            , (SELECT COUNT(*) FROM CTE) AS TotalRecords
      FROM CTE
      WHERE RowNumber BETWEEN ${offset} AND ${lastRow}
      ORDER BY RowNumber ASC
    `
    return query
  }

  private genSelectNew(table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    schema?: string,
    selects?: string[]
  ) {
    const filterString = _.isString(filters) ? `WHERE ${filters}` : this.buildFilterString(filters)

    const orderByString = this.genOrderByString(orderBy)
    const schemaString = schema ? `${this.wrapIdentifier(schema)}.` : ''

    const selectSQL = `SELECT ${selects.map((s) => this.wrapIdentifier(s)).join(", ")}`
    const baseSQL = `
      FROM ${schemaString}${this.wrapIdentifier(table)}
      ${filterString}
    `

    const offsetString = (_.isNumber(offset) && _.isNumber(limit)) ?
      `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY` : ''


    const query = `
      ${selectSQL} ${baseSQL}
      ${orderByString}
      ${offsetString}
      `
    return query
  }

  private buildFilterString(filters: TableFilter[]) {
    let filterString = ""
    if (filters && filters.length > 0) {
      const allFilters = filters.map((item) => {
        let wrappedValue = _.isArray(item.value) ?
          `(${item.value.map((v) => D.escapeString(v, true)).join(',')})` :
          D.escapeString(item.value, true)

        if (item.type.includes('is')) wrappedValue = 'NULL';

        return `${this.wrapIdentifier(item.field)} ${item.type.toUpperCase()} ${wrappedValue}`
      })
      filterString = "WHERE " + joinFilters(allFilters, filters)
    }
    return filterString
  }

  private genOrderByString(orderBy: OrderBy[]) {
    if (!orderBy) return ""

    let orderByString = "ORDER BY (SELECT NULL)"
    if (orderBy && orderBy.length > 0) {
      orderByString = "ORDER BY " + (orderBy.map((item: {field: any, dir: any}) => {
        if (_.isObject(item)) {
          return `${this.wrapIdentifier(item.field)} ${item.dir.toUpperCase()}`
        } else {
          return this.wrapIdentifier(item)
        }
      })).join(",")
    }
    return orderByString
  }

  private wrapValue(value: string) {
    return `'${value.replaceAll(/'/g, "''")}'`
  }

  private genCountQuery(table: string, filters: string | TableFilter[], schema: string) {
    const filterString = _.isString(filters) ? `WHERE ${filters}` : this.buildFilterString(filters)

    const schemaString = schema ? `${this.wrapIdentifier(schema)}.` : ''

    const baseSQL = `
     FROM ${schemaString}${this.wrapIdentifier(table)}
     ${filterString}
    `
    const countQuery = `
      select count(*) as total ${baseSQL}
    `
    return countQuery
  }

  private async getSchema() {
    const sql = 'SELECT schema_name() AS \'schema\''
    const { data } = await this.driverExecuteSingle(sql)

    return (data.recordsets[0] as any).schema
  }

  private async listDefaultConstraints(table: string, schema: string) {
    const sql = `
      -- returns name of a column's default value constraint
      SELECT
        all_columns.name as columnName,
        tables.name as tableName,
        schemas.name as schemaName,
        default_constraints.name as name
      FROM
        sys.all_columns
          INNER JOIN
        sys.tables
          ON all_columns.object_id = tables.object_id

          INNER JOIN
        sys.schemas
          ON tables.schema_id = schemas.schema_id

          INNER JOIN
        sys.default_constraints
          ON all_columns.default_object_id = default_constraints.object_id
      WHERE
        schemas.name = ${D.escapeString(schema || await this.defaultSchema(), true)}
        AND tables.name = ${D.escapeString(table, true)}
    `
    const { data } = await this.driverExecuteSingle(sql)
    return data.recordset.map((d) => {
      return {
        column: d.columnName,
        table: d.tableName,
        schema: d.schemaName,
        name: d.name
      }
    })
  }

  private async getTableDescription(table: string, schema: string | null = null) {
    schema = schema ?? await this.defaultSchema();
    const query = `SELECT *
      FROM fn_listextendedproperty (
        'MS_Description',
        'schema',
        '${escapeString(schema)}',
        'table',
        '${escapeString(table)}',
        default,
      default);
    `
    const { data } = await this.driverExecuteSingle(query)
    if (!data || !data.recordset || data.recordset.length === 0) {
      return null
    }
    return data.recordset[0].MS_Description
  }

  parseQueryResultColumns(qr: SQLServerResult): BksField[] {
    return Object.keys(qr.columns).map((key) => {
      const column = qr.columns[key]
      let bksType: BksFieldType = 'UNKNOWN'
      const type = column.type
      if (
        type === sql.VarBinary ||
          type === sql.Binary ||
          type === sql.Image
      ) {
        bksType = 'BINARY'
      }
      return { name: column.name, bksType }
    })
  }

  parseTableColumn(column: { column_name: string; data_type: string }): BksField {
    return {
      name: column.column_name,
      bksType: column.data_type.includes('varbinary') ? 'BINARY' : 'UNKNOWN',
    };
  }
}

export default async function (server: IDbConnectionServer, database: IDbConnectionDatabase) {
  const client = new SQLServerClient(server, database);
  await client.connect();

  return client;
}
