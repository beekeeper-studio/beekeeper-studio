// Original Copyright (c) 2015 The SQLECTRON Team
import { TableKey } from "@shared/lib/dialects/models";
import { SqliteData } from "@shared/lib/dialects/sqlite";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { SqliteChangeBuilder } from "@shared/lib/sql/change_builder/SqliteChangeBuilder";
import Database from "better-sqlite3";
import { ClientError, DatabaseElement, IDbConnectionDatabase, IDbConnectionServer } from "../client";
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, CancelableQuery, NgQueryResult, DatabaseFilterOptions, TableChanges, TableProperties, PrimaryKeyColumn, OrderBy, TableFilter, TableResult, StreamResults, QueryResult, TableInsert, TableUpdate, TableDelete } from "../models"; 
import { BasicDatabaseClient, ExecutionContext, QueryLogOptions } from "./BasicDatabaseClient"; import { buildInsertQueries, buildDeleteQueries, buildSelectTopQuery,  applyChangesSql } from './utils';
import knexlib from 'knex';
import { makeEscape } from 'knex/lib/util/string';
import { makeString } from '@/common/utils';
import { identify } from "sql-query-identifier";
import { Statement } from "sql-query-identifier/lib/defines";
import * as path from 'path';
import _ from 'lodash';
import rawLog from 'electron-log'
import { SqliteCursor } from "./sqlite/SqliteCursor";
const log = rawLog.scope('sqlite');

const knex = knexlib({
  client: 'better-sqlite3',
  // silence the "sqlite does not support inserting default values" warnings on every insert
  useNullAsDefault: true,
})

// HACK (day): this is to prevent the 'str.replace is not a function' error that seems to happen with all changes.
knex.client = Object.assign(knex.client, {
  _escapeBinding: makeEscape({
    escapeString(str) { str = makeString(str)
      return str ? `'${str.replace(/'/g, "''")}'` : ''
    }
  })
})

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

type SqliteResult = { 
  data: any,
  statement: Statement,
  // Number of changes made by the query
  changes: number 
};
const SD = SqliteData;

export class SqliteClient extends BasicDatabaseClient<SqliteResult> {

  version: SqliteResult;
  database: string;

  constructor(_server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, sqliteContext);

    this.database = database?.database;
  }

  versionString(): string {
    return this.version?.data[0]["sqlite_version()"];
  }

  getBuilder(table: string, _schema?: string): ChangeBuilderBase {
    return new SqliteChangeBuilder(table);
  }

  supportedFeatures(): SupportedFeatures {
    return { 
      customRoutines: false, 
      comments: false, 
      properties: true, 
      partitions: false, 
      editPartitions: false 
    };
  }

  async connect(): Promise<void> {
    // set sqlite version
    const version = await this.driverExecuteSingle('SELECT sqlite_version()');

    this.version = version;
    return;
  }

  disconnect(): Promise<void> {
    // SQLite does not have connection poll. So we open and close connections
    // for every query request. This allows multiple request at same time by
    // using a different thread for each connection.
    // This may cause connection limit problem. So we may have to change this at some point.
    return Promise.resolve();
  }

  async listTables(_db?: string, _filter?: FilterOptions): Promise<TableOrView[]> {
    const sql = `
      SELECT name
      FROM sqlite_master
      WHERE type='table'
      ORDER BY name
    `;

    const { data } = await this.driverExecuteSingle(sql);

    return data;
  }

  async listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    const sql = `
      SELECT name
      FROM sqlite_master
      WHERE type = 'view'
    `;

    const { data } = await this.driverExecuteSingle(sql);

    return data;
  }

  listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    return Promise.resolve([]); // DOES NOT SUPPORT IT
  }

  listMaterializedViewColumns(_db: string, _table: string, _schema?: string): Promise<TableColumn[]> {
    return Promise.resolve([]); // DOES NOT SUPPORT IT
  }

  async listTableColumns(db: string, table?: string, _schema?: string): Promise<ExtendedTableColumn[]> {
    if (table) {
      const sql = `PRAGMA table_info(${SD.escapeString(table, true)})`;

      const { data } = await this.driverExecuteSingle(sql);
      return this.dataToColumns(data, table);
    }

    const allTables = (await this.listTables(db)) || []
    const allViews = (await this.listViews()) || []
    const tables = allTables.concat(allViews)

    const everything = tables.map((table) => {
      return {
        tableName: table.name,
        sql: `PRAGMA table_info(${SD.escapeString(table.name, true)})`,
        results: null
      }
    })

    const query = everything.map((e) => e.sql).join(";")
    const allResults = await this.driverExecuteMultiple(query);
    const results = allResults.map((r, i) => {
      return {
        result: r,
        ...everything[i]
      }
    })
    const final = _.flatMap(results, (item, _idx) => this.dataToColumns(item.result.data, item.tableName))
    return final
  }

  async listTableTriggers(table: string, _schema?: string): Promise<TableTrigger[]> {
    const sql = `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'trigger'
        AND tbl_name = '${table}'
    `;

    const { data } = await this.driverExecuteSingle(sql);

    return data
  }

  async listTableIndexes(_db: string, table: string, _schema?: string): Promise<TableIndex[]> {
    const sql = `PRAGMA INDEX_LIST('${SD.escapeString(table)}')`;

    const { data } = await this.driverExecuteSingle(sql);

    const allSQL = data.map((row) => `PRAGMA INDEX_XINFO('${SD.escapeString(row.name)}')`).join(";");
    const infos = await this.driverExecuteMultiple(allSQL);

    const indexColumns = infos.map((result) => {
      return result.data.filter((r) => !!r.name).map((r) => ({ name: r.name, order: r.desc ? 'DESC' : 'ASC' }))
    })

    return data.map((row, idx) => ({
      id: row.seq,
      name: row.name,
      unique: row.unique === 1,
      primary: row.origin === 'pk',
      columns: indexColumns[idx],
      table
    }))
  }

  listSchemas(_db: string, _filter?: SchemaFilterOptions): Promise<string[]> {
    return Promise.resolve([]); // DOES NOT SUPPORT IT
  }

  getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    return Promise.resolve([]); // TODO: not implemented yet
  }

  async getTableKeys(_db: string, table: string, _schema?: string): Promise<TableKey[]> {
    const sql = `pragma foreign_key_list('${SD.escapeString(table)}')`
    const { data } = await this.driverExecuteSingle(sql);
    return data.map(row => ({
      constraintName: row.id,
      constraintType: 'FOREIGN',
      toTable: row.table,
      fromTable: table,
      fromColumn: row.from,
      toColumn: row.to,
      onUpdate: row.on_update,
      onDelete: row.on_delete
    }))
  }

  query(queryText: string): CancelableQuery {
    let queryConnection: Database.Database = null;

    return {
      execute: (async (): Promise<QueryResult> => {
        try {
          queryConnection = new Database(this.database);

          const result = await this.executeQuery(queryText, { connection: queryConnection })
          return result;
        } catch (err) {
          if (err.code === sqliteErrors.CANCELED) {
            err.sqlectronError = 'CANCELED_BY_USER';
          }

          if (err.message?.startsWith('no such column')) {
            const nuError = new ClientError(`${err.message} - Check that you only use double quotes (") for identifiers, not strings`, "https://docs.beekeeperstudio.io/pages/troubleshooting#no-such-column-x");
            throw nuError
          }

          throw err;
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
    const result = await this.driverExecuteMultiple(queryText, options);

    return (result || []).map(({ data, statement, changes }) => {
      // Fallback in case the identifier could not reconize the command
      const isSelect = Array.isArray(data);
      const rows = data || [];
      return {
        command: statement.type || (isSelect && 'SELECT'),
        rows,
        fields: Object.keys(rows[0] || {}).map((name) => ({name, id: name })),
        rowCount: data && data.length,
        affectedRows: changes || 0,
      };
    });
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    const result = await this.driverExecuteSingle('PRAGMA database_list;');

    return result.data.map((row) => row.file || ':memory:');
  }

  applyChangesSql(changes: TableChanges): string {
    return applyChangesSql(changes, this.knex)
  }

  async applyChanges(changes: TableChanges): Promise<any[]> {
    let results = [];

    const connection = new Database(this.database);
    const cli = { connection };
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
    }

    return results;
  }

  getQuerySelectTop(table: string, limit: number, _schema?: string): string {
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
      this.listTableIndexes(null, table),
      this.listTableTriggers(table),
      this.getTableKeys(null, table)
    ])
    return {
      size: length, 
      indexes, 
      relations, 
      triggers
    }  
  }

  async getTableCreateScript(table: string, _schema?: string): Promise<string> {
    const sql = `
      SELECT sql
      FROM sqlite_master
      WHERE name = '${table}';
    `;

    const { data } = await this.driverExecuteSingle(sql);

    return data.map((row) => row.sql);
  }

  async getViewCreateScript(view: string, _schema?: string): Promise<string[]> {
    const sql = `
      SELECT sql
      FROM sqlite_master
      WHERE name = '${view}';
    `;

    const { data } = await this.driverExecuteSingle(sql);

    return data.map((row) => row.sql);
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

  async getPrimaryKey(db: string, table: string, schema?: string): Promise<string> {
    const keys = await this.getPrimaryKeys(db, table, schema);
    return keys.length === 1 ? keys[0].columnName : null
  }

  async getPrimaryKeys(_db: string, table: string, _schema?: string): Promise<PrimaryKeyColumn[]> {
    const sql = `pragma table_info('${SD.escapeString(table)}')`
    const { data } = await this.driverExecuteSingle(sql);
    const found = data.filter(r => r.pk > 0)
    if (!found || found.length === 0) return []
    return found.map((r) => ({
      columnName: r.name,
      position: Number(r.pk)
    }))
  }

  async getTableLength(table: string, _schema?: string): Promise<number> {
    const { countQuery, params } = buildSelectTopQuery(table, null, null, null, [])
    const countResults = await this.driverExecuteSingle(countQuery, { params });
    const rowWithTotal = countResults.data.find((row) => { return row.total })
    const totalRecords = rowWithTotal ? rowWithTotal.total : 0
    return Number(totalRecords)
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult> {
    const query = await this.selectTopSql(table, offset, limit, orderBy, filters, schema, selects);
    const result = await this.driverExecuteSingle(query);

    return {
      result: result.data,
      fields: Object.keys(result.data[0] || {})
    };
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], _schema?: string, selects?: string[]): Promise<string> {
    const { query, params } = buildSelectTopQuery(table, offset, limit, orderBy, filters, undefined, undefined, selects);
    return this.knex.raw(query, params).toQuery();
  }

  async selectTopStream(db: string, table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, _schema?: string): Promise<StreamResults> {
    const qs = buildSelectTopQuery(table, null, null, orderBy, filters)
    const columns = await this.listTableColumns( db, table)
    const rowCount = await this.getTableLength(table)
    const { query, params } = qs
    return {
      totalRows: rowCount,
      columns,
      cursor: new SqliteCursor(this.database, query, params, chunkSize)
    }
  }

  async queryStream(_db: string, query: string, chunkSize: number): Promise<StreamResults> {
    return {
      totalRows: undefined,
      columns: undefined, 
      cursor: new SqliteCursor(this.database, query, [], chunkSize)
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

  async dropElement(elementName: string, typeOfElement: DatabaseElement, _schema?: string): Promise<void> {
    const sql = `DROP ${SD.wrapLiteral(typeOfElement)} ${this.wrapIdentifier(elementName)}`

    await this.driverExecuteSingle(sql);
  }

  async truncateElement(elementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<void> {
    const sql = `Delete from ${SD.wrapIdentifier(elementName)}; vacuum;`

    await this.driverExecuteSingle(sql);
  }

  async duplicateTable(tableName: string, duplicateTableName: string, _schema?: string): Promise<void> {
    const sql = this.duplicateTableSql(tableName, duplicateTableName);

    await this.driverExecuteSingle(sql);
  }

  duplicateTableSql(tableName: string, duplicateTableName: string, _schema?: string): string {
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

  createDatabase(databaseName: string, _charset: string, _collation: string): void {
    // because this is a convenience for an otherwise ez-pz action, the location of the db file will be in the same location as the other .db files.
    // If the desire for a "but I want this in another directory" is ever wanted, it can be included but for now this feels like it suits the current needs.
    const fileLocation = this.database.split('/');
    fileLocation.pop();

    const dbPath = path.join(...fileLocation, `${databaseName}.db`);

    const db = new Database(dbPath)
    db.close()
  }

  createDatabaseSQL(): string {
    throw new Error("Method not implemented.");
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<SqliteResult | SqliteResult[]> {
    const queries = this.identifyCommands(q);
    const params = options.params || [];

    const results = [];

    const connection = options.connection ? options.connection : new Database(this.database);
    // Fix (part 1 of 2) Issue #1399 - int64s not displaying properly
    // Binds ALL better-sqlite3 integer columns as BigInts by default
    // https://github.com/WiseLibs/better-sqlite3/blob/master/docs/integer.md#getting-bigints-from-the-database
    // (Part 2 of 2 is in apps/studio/src/common/initializers/big_int_initializer.ts)
    connection.defaultSafeIntegers(true);

    // we do it this way to ensure the queries are run IN ORDER
    for (let index = 0; index < queries.length; index++) {
      const query = queries[index];

      const statement: Database.Statement = connection.prepare(query.text);

      try {
        const result = statement.reader ? statement.all(params) : statement.run(params);

        results.push({
          data: result || [],
          statement: query,
          changes: statement.reader ? 0 : (result as Database.RunResult).changes 
        });
      } catch (error) {
        log.error(error);
        throw error;
      }
    }

    return options.multiple ? results : results[0];
  }

  
  private dataToColumns(data, tableName) {
    return data.map((row) => ({
      tableName,
      columnName: row.name,
      dataType: row.type,
      nullable: Number(row.notnull || 0) === 0,
      defaultValue: row.dflt_value === 'NULL' ? null : row.dflt_value,
      ordinalPosition: Number(row.cid)
    }))
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
        console.log('updateValues, column, value', column, value)
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
      if (r.data[0]) results.push(r.data[0])
    }

    return results
  }

  private async deleteRows(cli: any, deletes: TableDelete[]) {
    for (const command of buildDeleteQueries(knex, deletes)) {
      await this.driverExecuteSingle(command, cli)
    }

    return true
  }
}

export default async function (server: IDbConnectionServer, database: IDbConnectionDatabase) {
  const client = new SqliteClient(server, database);
  await client.connect();
  return client;
}
