// Original Copyright (c) 2015 The SQLECTRON Team
import { IndexColumn, TableKey } from "@shared/lib/dialects/models";
import { SqliteData } from "@shared/lib/dialects/sqlite";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { SqliteChangeBuilder } from "@shared/lib/sql/change_builder/SqliteChangeBuilder";
import Database from "better-sqlite3";
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, CancelableQuery, NgQueryResult, DatabaseFilterOptions, TableChanges, TableProperties, PrimaryKeyColumn, OrderBy, TableFilter, TableResult, StreamResults, QueryResult, TableInsert, TableUpdate, TableDelete, ImportFuncOptions, BksField, BksFieldType } from "../models";
import { DatabaseElement, IDbConnectionDatabase } from "../types";
import { ClientError } from "./utils";
import { BasicDatabaseClient, ExecutionContext, QueryLogOptions } from "./BasicDatabaseClient"; import { buildInsertQueries, buildDeleteQueries, buildSelectTopQuery } from './utils';
import { identify } from "sql-query-identifier";
import { IdentifyResult, Statement } from "sql-query-identifier/lib/defines";
import * as path from 'path';
import _ from 'lodash';
import { SqliteCursor } from "./sqlite/SqliteCursor";
import { createSQLiteKnex } from "./sqlite/utils";
import { IDbConnectionServer } from "../backendTypes";
import { GenericBinaryTranscoder } from "../serialization/transcoders";

import rawLog from '@bksLogger'
const log = rawLog.scope('sqlite');

const knex = createSQLiteKnex();

const sqliteErrors = {
  CANCELED: 'SQLITE_INTERRUPT',
};

const sqliteContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null;
  }
}

export type SqliteResult = {
  rows: any[][] | Record<string, any>[],
  columns: Database.ColumnDefinition[],
  statement: Statement,
  // Number of changes made by the query
  changes: number
  arrayMode: boolean
};
const SD = SqliteData;

export class SqliteClient extends BasicDatabaseClient<SqliteResult> {
  version: SqliteResult;
  databasePath: string;
  dialectData = SD;
  isTempDB = false;
  _rawConnection: Database.Database;
  transcoders = [GenericBinaryTranscoder];

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, sqliteContext, server, database);

    this.dialect = 'sqlite';
    this.readOnlyMode = server?.config?.readOnlyMode || false;
    this.databasePath = database?.database;
    this.isTempDB = _.isEmpty(this.databasePath) || this.databasePath === ':memory:';
  }

  async versionString(): Promise<string> {
    return this.version?.rows[0]["version"];
  }

  getBuilder(table: string, _schema?: string): ChangeBuilderBase {
    return new SqliteChangeBuilder(table);
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: false,
      comments: false,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: true,
      backDirFormat: false,
      restore: true,
      indexNullsNotDistinct: false,
      filterTypes: ['standard']
    };
  }

  async connect(): Promise<void> {
    await super.connect();

    // verify that the connection is valid
    await this.driverExecuteSingle('PRAGMA schema_version', { overrideReadonly: true });

    // set sqlite version
    const version = await this.driverExecuteSingle('SELECT sqlite_version() as version');
    this.version = version;

    return;
  }

  disconnect(): Promise<void> {
    // SQLite does not have connection poll. So we open and close connections
    // for every query request. This allows multiple request at same time by
    // using a different thread for each connection.
    // This may cause connection limit problem. So we may have to change this at some point.
    return Promise.resolve();
    try {
      this.knex.destroy()
    } catch {
      // don't worry if this doesn't work.
    }
  }

  async listTables(_filter?: FilterOptions): Promise<TableOrView[]> {
    const sql = `
      SELECT name
      FROM sqlite_master
      WHERE type='table'
      ORDER BY name
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows as TableOrView[];
  }

  async listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    const sql = `
      SELECT name
      FROM sqlite_master
      WHERE type = 'view'
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows as TableOrView[];
  }

  listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    return Promise.resolve([]); // DOES NOT SUPPORT IT
  }

  listMaterializedViewColumns(_table: string, _schema?: string): Promise<TableColumn[]> {
    return Promise.resolve([]); // DOES NOT SUPPORT IT
  }

  async listTableColumns(table?: string, _schema?: string): Promise<ExtendedTableColumn[]> {
    if (table) {
      const sql = `PRAGMA table_xinfo(${SD.escapeString(table, true)})`;

      const { rows } = await this.driverExecuteSingle(sql, { overrideReadonly: true });
      return this.dataToColumns(rows, table);
    }

    const allTables = (await this.listTables()) || []
    const allViews = (await this.listViews()) || []
    const tables = allTables.concat(allViews)

    const everything = tables.map((table) => {
      return {
        tableName: table.name,
        sql: `PRAGMA table_xinfo(${SD.escapeString(table.name, true)})`,
        results: null
      }
    })

    const query = everything.map((e) => e.sql).join(";")
    const allResults = await this.driverExecuteMultiple(query, { overrideReadonly: true });
    const results = allResults.map((r, i) => {
      return {
        result: r,
        ...everything[i]
      }
    })
    const final = _.flatMap(results, (item, _idx) => this.dataToColumns(item.result.rows, item.tableName))

    log.info('FINAL: ', final)
    return final
  }

  async listTableTriggers(table: string, _schema?: string): Promise<TableTrigger[]> {
    const sql = `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'trigger'
        AND tbl_name = '${table}'
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows as TableTrigger[]
  }

  async listTableIndexes(table: string, _schema?: string): Promise<TableIndex[]> {
    const sql = `PRAGMA index_list('${SD.escapeString(table)}')`;

    const { rows } = await this.driverExecuteSingle(sql, { overrideReadonly: true });

    const allSQL = rows.map((row) => `PRAGMA index_xinfo('${SD.escapeString(row.name)}')`).join(";");
    const infos = await this.driverExecuteMultiple(allSQL, { overrideReadonly: true });

    const indexColumns: IndexColumn[][] = infos.map((result) => {
      return result.rows.filter((r) => !!r.name).map((r) => ({ name: r.name, order: r.desc ? 'DESC' : 'ASC' }))
    })

    return rows.map((row, idx) => ({
      id: row.seq,
      name: row.name,
      unique: !!row.unique && row.unique !== BigInt(0),
      primary: row.origin === 'pk',
      columns: indexColumns[idx],
      schema: '',
      table,
    }))
  }

  listSchemas(_filter?: SchemaFilterOptions): Promise<string[]> {
    return Promise.resolve([]); // DOES NOT SUPPORT IT
  }

  getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    return Promise.resolve([]); // TODO: not implemented yet
  }

  async getOutgoingKeys(table: string, _schema?: string): Promise<TableKey[]> {
    const sql = `
      SELECT
        '${SD.escapeString(table)}' AS from_table,
        p."from" AS from_column,
        p."table" AS to_table,
        p."to" AS to_column,
        p.on_update as on_update,
        p.on_delete as on_delete,
        p.id as id
      FROM pragma_foreign_key_list('${SD.escapeString(table)}') p
      ORDER BY id;
    `
    const { rows } = await this.driverExecuteSingle(sql, { overrideReadonly: true });
    return rows.map(row => ({
      constraintName: row.id,
      constraintType: 'FOREIGN',
      toTable: row.to_table,
      toSchema: '',
      fromSchema: '',
      fromTable: row.from_table,
      fromColumn: row.from_column,
      toColumn: row.to_column,
      onUpdate: row.on_update,
      onDelete: row.on_delete,
      isComposite: false,
    }))
  }

  async getIncomingKeys(table: string, _schema?: string): Promise<TableKey[]> {
    const sql = `
      SELECT
        m.name AS from_table,
        p."from" AS from_column,
        p."table" AS to_table,
        p."to" AS to_column,
        p.on_update as on_update,
        p.on_delete as on_delete,
        p.id as id
      FROM sqlite_master AS m
      JOIN pragma_foreign_key_list(m.name) AS p
      WHERE p."table" = '${SD.escapeString(table)}'
      ORDER BY id, from_table;
    `
    const { rows } = await this.driverExecuteSingle(sql, { overrideReadonly: true });
    return rows.map(row => ({
      constraintName: row.id,
      constraintType: 'FOREIGN',
      toTable: row.to_table,
      toSchema: '',
      fromSchema: '',
      fromTable: row.from_table,
      fromColumn: row.from_column,
      toColumn: row.to_column,
      onUpdate: row.on_update,
      onDelete: row.on_delete,
      isComposite: false,
    }))
  }

  async query(queryText: string): Promise<CancelableQuery> {
    let queryConnection: Database.Database = null;

    return {
      execute: (async (): Promise<QueryResult> => {
        try {
          queryConnection = this.acquireConnection();

          const result = await this.executeQuery(queryText, { connection: queryConnection, arrayMode: true });
          return result;
        } catch (err) {
          if (err.code === sqliteErrors.CANCELED) {
            err.sqlectronError = 'CANCELED_BY_USER';
          }

          if (err.message?.startsWith('no such column')) {
            const nuError = new ClientError(`${err.message} - Check that you only use double quotes (") for identifiers, not strings`, "https://docs.beekeeperstudio.io/support/troubleshooting/#no-such-column-x");
            throw nuError
          }

          throw err;
        } finally {
          if (queryConnection !== this._rawConnection) {
            queryConnection.close();
          }
        }
      }).bind(this),
      async cancel() {
        if (!queryConnection) {
          throw new Error('Query not ready to be canceled');
        }
      }
    }
  }

  async executeQuery(queryText: string, options: any = {}): Promise<NgQueryResult[]> {
    const arrayMode: boolean = options.arrayMode;
    const result = await this.driverExecuteMultiple(queryText, options);

    return (result || []).map(({ rows: data, columns, statement, changes }) => {
      // Fallback in case the identifier could not reconize the command
      const isSelect = Array.isArray(data);
      let rows: any[];
      let fields: any[];

      if (isSelect && arrayMode) {
        rows = data.map((row: any[]) =>
          Array.prototype.reduce.call(row, (obj, val, idx) => {
            obj[`c${idx}`] = val;
            return obj
          }, {})
        );
        fields = columns.map((column, idx) => ({
          id: `c${idx}`,
          name: column.name
        }))
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

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    const result = await this.driverExecuteSingle('PRAGMA database_list;', { overrideReadonly: true });

    return result.rows.map((row) => row.file || ':memory:');
  }

  async executeApplyChanges(changes: TableChanges): Promise<any[]> {
    let results = [];

    const cli = { connection: this.acquireConnection() };
    await this.driverExecuteSingle('BEGIN', cli);

    try {
      if (changes.inserts) {
        await this.insertRows(cli, changes.inserts);
      }

      if (changes.updates) {
        results = await this.updateValues(cli, changes.updates);
      }

      if (changes.deletes) {
        await this.deleteRows(cli, changes.deletes);
      }

      await this.driverExecuteSingle('COMMIT', cli);
    } catch (ex) {
      log.error("query exception: ", ex);
      await this.driverExecuteSingle('ROLLBACK', cli);
      throw ex;
    } finally {
      if (cli.connection !== this._rawConnection) {
        cli.connection.close();
      }
    }

    return results;
  }

  async getQuerySelectTop(table: string, limit: number, _schema?: string): Promise<string> {
    return `SELECT * FROM ${this.wrapIdentifier(table)} LIMIT ${limit}`;
  }

  async getTableProperties(table: string, _schema?: string): Promise<TableProperties> {
    const [
      length,
      indexes,
      triggers,
      relations
    ] = await Promise.all([
      this.getTableLength(table),
      this.listTableIndexes(table),
      this.listTableTriggers(table),
      this.getTableKeys(table)
    ])
    return {
      size: length,
      indexes,
      relations,
      triggers,
      partitions: []
    }
  }

  async getTableCreateScript(table: string, _schema?: string): Promise<string> {
    const sql = `
      SELECT sql
      FROM sqlite_master
      WHERE name = '${table}';
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((row) => row.sql)[0];
  }

  async getViewCreateScript(view: string, _schema?: string): Promise<string[]> {
    const sql = `
      SELECT sql
      FROM sqlite_master
      WHERE name = '${view}';
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((row) => row.sql);
  }

  getRoutineCreateScript(_routine: string, _type: string, _schema?: string): Promise<string[]> {
    return Promise.resolve([]); // DOES NOT SUPPORT IT
  }

  async truncateAllTables(_db?: string, _schema?: string): Promise<void> {
    const tables = await this.listTables();

    const truncateAll = tables.map((table) => `
        DELETE FROM ${table.name};
      `).join('');

    // TODO: Check if sqlite_sequence exists then execute:
    // DELETE FROM sqlite_sequence WHERE name='${table}';

    await this.driverExecuteSingle(truncateAll);
  }

  listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return Promise.resolve([]);
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string> {
    const keys = await this.getPrimaryKeys(table, schema);
    return keys.length === 1 ? keys[0].columnName : null
  }

  async getPrimaryKeys(table: string, _schema?: string): Promise<PrimaryKeyColumn[]> {
    const sql = `pragma table_xinfo('${SD.escapeString(table)}')`
    const { rows } = await this.driverExecuteSingle(sql, { overrideReadonly: true });
    const found = rows.filter(r => r.pk > 0)
    if (!found || found.length === 0) return []
    return found.map((r) => ({
      columnName: r.name,
      position: Number(r.pk)
    }))
  }

  async getTableLength(table: string, _schema?: string): Promise<number> {
    const { countQuery, params } = buildSelectTopQuery(table, null, null, null, [])
    const countResults = await this.driverExecuteSingle(countQuery, { params });
    const rowWithTotal = countResults.rows.find((row) => { return row.total })
    const totalRecords = rowWithTotal ? rowWithTotal.total : 0
    return Number(totalRecords)
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult> {
    const query = await this.selectTopSql(table, offset, limit, orderBy, filters, schema, selects);
    const result = await this.driverExecuteSingle(query);
    const fields = this.parseQueryResultColumns(result);
    const rows = await this.serializeQueryResult(result, fields);
    return { result: rows, fields };
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], _schema?: string, selects?: string[]): Promise<string> {
    const { query, params } = buildSelectTopQuery(table, offset, limit, orderBy, filters, undefined, undefined, selects);
    return this.knex.raw(query, params).toQuery();
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, _schema?: string): Promise<StreamResults> {
    const qs = buildSelectTopQuery(table, null, null, orderBy, filters)
    const columns = await this.listTableColumns(table)
    const rowCount = await this.getTableLength(table)
    const { query, params } = qs
    return {
      totalRows: rowCount,
      columns,
      cursor: this.createCursor(this.isTempDB ? this.acquireConnection() : this.databasePath, query, params, chunkSize)
    }
  }

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    const { columns, totalRows } = await this.getColumnsAndTotalRows(query)

    return {
      totalRows,
      columns,
      cursor: this.createCursor(this.isTempDB ? this.acquireConnection() : this.databasePath, query, [], chunkSize)
    };
  }

  wrapIdentifier(value: string): string {
    if (value === '*') return value;
    const matched = value.match(/(.*?)(\[[0-9]\])/); // eslint-disable-line no-useless-escape
    if (matched) return this.wrapIdentifier(matched[1]) + matched[2];
    return `"${value.replace(/"/g, '""')}"`;
  }

  setTableDescription(_table: string, _description: string, _schema?: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async setElementNameSql(elementName: string, newElementName: string, typeOfElement: DatabaseElement): Promise<string> {
    if (typeOfElement !== DatabaseElement.TABLE) {
      return ''
    }

    return `ALTER TABLE ${this.wrapIdentifier(elementName)} RENAME TO ${this.wrapIdentifier(newElementName)};`
  }

  async dropElement(elementName: string, typeOfElement: DatabaseElement, _schema?: string): Promise<void> {
    const sql = `DROP ${SD.wrapLiteral(typeOfElement)} ${this.wrapIdentifier(elementName)}`

    await this.driverExecuteSingle(sql);
  }

  async truncateElementSql(elementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    return `Delete from ${SD.wrapIdentifier(elementName)}; vacuum;`
  }

  async duplicateTable(tableName: string, duplicateTableName: string, _schema?: string): Promise<void> {
    const sql = await this.duplicateTableSql(tableName, duplicateTableName);

    await this.driverExecuteSingle(sql);
  }

  async duplicateTableSql(tableName: string, duplicateTableName: string, _schema?: string): Promise<string> {
    return `CREATE TABLE ${SD.wrapIdentifier(duplicateTableName)} AS SELECT * FROM ${SD.wrapIdentifier(tableName)};`
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
    // because this is a convenience for an otherwise ez-pz action, the location of the db file will be in the same location as the other .db files.
    // If the desire for a "but I want this in another directory" is ever wanted, it can be included but for now this feels like it suits the current needs.
    const fileLocation = path.parse(this.databasePath).dir;

    const dbPath = path.join(fileLocation, `${databaseName}.db`);

    this._createDatabase(dbPath);

    return dbPath;
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async runWithConnection<T>(child: (c: any) => Promise<T>): Promise<T> {
    const connection = this.acquireConnection();
    try {
      return await child(connection);
    } finally {
      if (connection != this._rawConnection) {
        connection.close();
      }
    }
  }

  async importTruncateCommand (table: TableOrView, { executeOptions }: ImportFuncOptions): Promise<any> {
    const { name } = table
    return this.rawExecuteQuery(`Delete from ${SD.wrapIdentifier(name)}`, executeOptions)
  }

  async importLineReadCommand (_table: TableOrView, sqlString: string, { executeOptions }: ImportFuncOptions): Promise<any> {
    return this.rawExecuteQuery(sqlString, executeOptions)
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<SqliteResult | SqliteResult[]> {
    const queries = this.identifyCommands(q);
    const params = (options.params || []).map((p) => _.isBoolean(p) ? Number(p) : p);
    const arrayMode = options.arrayMode;

    const results: SqliteResult[] = [];

    const connection = options.connection ? options.connection : this.acquireConnection();
    const acquiredNewConnection = options.connection ? false : true;
    // Fix (part 1 of 2) Issue #1399 - int64s not displaying properly
    // Binds ALL better-sqlite3 integer columns as BigInts by default
    // https://github.com/WiseLibs/better-sqlite3/blob/master/docs/integer.md#getting-bigints-from-the-database
    // (Part 2 of 2 is in apps/studio/src/common/initializers/big_int_initializer.ts)
    connection.defaultSafeIntegers(true);

    console.log("Extensions: ", this.server.config.runtimeExtensions)
    if (this.server.config.runtimeExtensions && this.server.config.runtimeExtensions.length > 0) {
      for (const extension of this.server.config.runtimeExtensions) {
        try {
          connection.loadExtension(extension)
        } catch (err) {
          log.error(`Unable to load extension file ${extension}`)
          throw err
        }
      }
    }

    // we do it this way to ensure the queries are run IN ORDER
    for (let index = 0; index < queries.length; index++) {
      const query = queries[index];

      const statement: Database.Statement = connection.prepare(query.text);

      try {
        let runResult: Database.RunResult | undefined;
        let rows: any[] = [];
        let columns: Database.ColumnDefinition[] = [];
        const reader = this.checkReader(query, statement);

        if (reader) {
          if (arrayMode) {
            statement.raw();
          }
          rows = statement.all(params)
          columns = statement.columns();
        } else {
          runResult = statement.run(params);
        }

        results.push({
          rows: rows || [],
          columns,
          statement: query,
          changes: reader ? 0 : runResult.changes,
          arrayMode,
        });
      } catch (error) {
        log.error(error);
        if (acquiredNewConnection && connection !== this._rawConnection) {
          connection.close();
        }
        throw error;
      }
    }

    if (acquiredNewConnection && connection !== this._rawConnection) {
      connection.close();
    }

    return options.multiple ? results : results[0];
  }

  protected acquireConnection(): Database.Database {
    if (this.isTempDB) {
      if (!this._rawConnection) {
        this._rawConnection = this.createRawConnection(':memory:');
      }
      return this._rawConnection;
    }
    return this.createRawConnection(this.databasePath);
  }

  protected createRawConnection(filename: string) {
    return new Database(filename);
  }

  protected checkReader(_queryIdentifyResult: IdentifyResult, statement: Database.Statement): boolean {
    return statement.reader;
  }

  protected createCursor(...args: ConstructorParameters<typeof SqliteCursor>): SqliteCursor {
    return new SqliteCursor(...args);
  }

  protected _createDatabase(path: string) {
    const db = new Database(path)
    db.close()
  }

  private dataToColumns(data: any[], tableName: string): ExtendedTableColumn[] {
    return data.map((row) => {
      const defaultValue = row.dflt_value === 'NULL' ? null : row.dflt_value
      return {
        tableName,
        columnName: row.name,
        dataType: row.type,
        nullable: Number(row.notnull || 0) === 0,
        defaultValue,
        ordinalPosition: Number(row.cid),
        hasDefault: !_.isNil(defaultValue),
        generated: Number(row.hidden) === 2 || Number(row.hidden) === 3,
        bksField: this.parseTableColumn(row),
      }
    })
  }

  private identifyCommands(queryText: string) {
    try {
      return identify(queryText, { strict: false, dialect: 'sqlite' });
    } catch (err) {
      return [];
    }
  }

  private async insertRows(cli: any, inserts: TableInsert[]) {
    for (const command of buildInsertQueries(knex, inserts)) {
      await this.driverExecuteSingle(command, cli);
    }

    return true
  }

  private async updateValues(cli: any, updates: TableUpdate[]) {
    const commands = updates.map(update => {
      const params = [_.isBoolean(update.value) ? _.toInteger(update.value) : update.value];
      const whereList = []
      update.primaryKeys.forEach(({ column, value }) => {
        whereList.push(`${this.wrapIdentifier(column)} = ?`);
        params.push(value);
      })

      const where = whereList.join(" AND ");

      return {
        query: `UPDATE ${update.table} SET ${update.column} = ? WHERE ${where}`,
        params: params
      }
    })

    const results = []
    // TODO: this should probably return the updated values
    for (let index = 0; index < commands.length; index++) {
      const blob = commands[index];
      await this.driverExecuteSingle(blob.query, { ...cli, params: blob.params });
    }

    const returnQueries = updates.map(update => {

      const params = [];
      const whereList = []
      update.primaryKeys.forEach(({ column, value }) => {
        log.log('updateValues, column, value', column, value)
        whereList.push(`${this.wrapIdentifier(column)} = ?`);
        params.push(value);
      })

      const where = whereList.join(" AND ");

      return {
        query: `select * from "${update.table}" where ${where}`,
        params: params
      }
    })

    for (let index = 0; index < returnQueries.length; index++) {
      const blob = returnQueries[index];
      const r = await this.driverExecuteSingle(blob.query, { ...cli, params: blob.params });
      if (r.rows[0]) results.push(r.rows[0])
    }

    return results
  }

  private async deleteRows(cli: any, deletes: TableDelete[]) {
    for (const command of buildDeleteQueries(knex, deletes)) {
      await this.driverExecuteSingle(command, cli)
    }

    return true
  }

  parseQueryResultColumns(qr: SqliteResult): BksField[] {
    return qr.columns.map(this.parseTableColumn);
  }

  parseTableColumn(column: { name: string, type: string }): BksField {
    let bksType: BksFieldType = "UNKNOWN";
    if (column.type === "BLOB") {
      bksType = "BINARY";
    }
    return { name: column.name, bksType };
  }
}
