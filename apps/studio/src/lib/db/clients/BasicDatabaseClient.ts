import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, SchemaFilterOptions, DatabaseFilterOptions, TableChanges, OrderBy, TableFilter, TableResult, StreamResults, CancelableQuery, ExtendedTableColumn, PrimaryKeyColumn, TableProperties, TableIndex, TableTrigger, TableInsert, NgQueryResult, TablePartition, TableUpdateResult, ImportFuncOptions, DatabaseEntity, BksField, ServerStatistics } from '../models';
import { AlterPartitionsSpec, AlterTableSpec, CreateTableSpec, IndexAlterations, RelationAlterations, TableKey } from '@shared/lib/dialects/models';
import { buildInsertQueries, buildInsertQuery, errorMessages, isAllowedReadOnlyQuery, joinQueries, applyChangesSql } from './utils';
import { Knex } from 'knex';
import _ from 'lodash'
import { ChangeBuilderBase } from '@shared/lib/sql/change_builder/ChangeBuilderBase';
import { identify } from 'sql-query-identifier';
import { ConnectionType, DatabaseElement, IBasicDatabaseClient, IDbConnectionDatabase } from '../types';
import rawLog from "@bksLogger";
import connectTunnel from '../tunnel';
import { IDbConnectionServer } from '../backendTypes';
import platformInfo from '@/common/platform_info';
import { LicenseKey } from '@/common/appdb/models/LicenseKey';
import { IdentifyResult } from 'sql-query-identifier/lib/defines';
import { Transcoder } from '../serialization/transcoders';

const log = rawLog.scope('BasicDatabaseClient');
const logger = () => log;


export interface ExecutionContext {
    executedBy: 'user' | 'app'
    location: string // eg tab name or ID
    purpose?: string // why
    details?: string // any useful details
}

// we're assuming that the params have been resolved already
export interface QueryLogOptions {
    options: any // just whatever options the database driver provides.
    status: 'completed' | 'failed'
    error?: string
}

interface ColumnsAndTotalRows {
  columns: TableColumn[]
  totalRows: number
}

// this provides the ability to get the current tab information, plus provides
// a way to log the data to a table in the app sqlite.
// this is a useful design if BKS ever gains a web version.
// it returns an ID to use
export interface AppContextProvider {
    getExecutionContext(): ExecutionContext
    logQuery(query: string, options: QueryLogOptions, context: ExecutionContext ): Promise<number | string>
}

export const NoOpContextProvider: AppContextProvider = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null;
  }
};

export interface BaseQueryResult {
  columns: { name: string, type?: string | number | any }[]
  rows: any[][] | Record<string, any>[];
  arrayMode: boolean;
}

// raw result type is specific to each database implementation
export abstract class BasicDatabaseClient<RawResultType extends BaseQueryResult, Conn = null> implements IBasicDatabaseClient {
  knex: Knex | null;
  contextProvider: AppContextProvider;
  dialect: "mssql" | "sqlite" | "mysql" | "oracle" | "psql" | "bigquery" | "generic";
  // TODO (@day): this can be cleaned up when we fix configuration
  readOnlyMode = false;
  server: IDbConnectionServer;
  database: IDbConnectionDatabase;
  db: string;
  connectionType: ConnectionType;
  connErrHandler: (msg: string) => void = null;
  reservedConnections: Map<number, Conn> = new Map<number, Conn>();
  transcoders: Transcoder<any, any>[] = [];

  constructor(knex: Knex | null, contextProvider: AppContextProvider, server: IDbConnectionServer, database: IDbConnectionDatabase) {
    this.knex = knex;
    this.contextProvider = contextProvider
    this.server = server;
    this.database = database;
    this.db = database?.database
    this.connectionType = this.server?.config.client;
  }

  async checkAllowReadOnly() {
    if (platformInfo.testMode) return true;
    const status = await LicenseKey.getLicenseStatus()
    return status.isUltimate;
  }

  set connectionHandler(fn: (msg: string) => void) {
    this.connErrHandler = fn;
  }

  abstract getBuilder(table: string, schema?: string): ChangeBuilderBase | Promise<ChangeBuilderBase>;

  // DB Metadata ****************************************************************
  abstract supportedFeatures(): Promise<SupportedFeatures>;
  abstract versionString(): Promise<string>;

  async defaultSchema(): Promise<string | null> {
    return null
  }

  async getCompletions(_cmd: string): Promise<string[]> {
    return [];
  }

  async getShellPrompt(): Promise<string> {
    return '';
  }
  // ****************************************************************************

  // Connection *****************************************************************
  async connect(_signal?: AbortSignal): Promise<void> {
    /* eslint no-param-reassign: 0 */
    if (this.database.connecting) {
      throw new Error('There is already a connection in progress for this database. Aborting this new request.');
    }

    try {
      this.database.connecting = true;

      // terminate any previous lost connection for this DB
      if (this.database.connected) {
        await this.disconnect();
      }

      // reuse existing tunnel
      if (this.server.config.ssh && !this.server.sshTunnel) {
        logger().debug('creating ssh tunnel');
        this.server.sshTunnel = await connectTunnel(this.server.config);

        this.server.config.localHost = this.server.sshTunnel.localHost
        this.server.config.localPort = this.server.sshTunnel.localPort
      }

    } catch (err) {
      logger().error('Connection error %j', err);
      // this.disconnect(this.server, this.database);
      throw new Error('Database Connection Error: ' + err.message);
    } finally {
      this.database.connecting = false;
    }
  }
  async disconnect(): Promise<void> {
    this.database.connecting = false;

    if (this.server.sshTunnel) {
      await this.server.sshTunnel.connection.shutdown();
    }

    if (this.server.db[this.database.database]) {
      // delete this.server.db[this.database.database]
    }
    await this.knex?.destroy();
  }
  // ****************************************************************************

  // List schema information ****************************************************
  abstract listTables(filter?: FilterOptions): Promise<TableOrView[]>;
  abstract listViews(filter?: FilterOptions): Promise<TableOrView[]>;
  abstract listRoutines(filter?: FilterOptions): Promise<Routine[]>;
  abstract listMaterializedViewColumns(table: string, schema?: string): Promise<TableColumn[]>;
  abstract listTableColumns(table?: string, schema?: string): Promise<ExtendedTableColumn[]>;
  abstract listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]>;
  abstract listTableIndexes(table: string, schema?: string): Promise<TableIndex[]>;
  abstract listSchemas(filter?: SchemaFilterOptions): Promise<string[]>;
  abstract getTableReferences(table: string, schema?: string): Promise<string[]>;
  /** @alias `getOutgoingKeys` */
  async getTableKeys(table: string, schema?: string): Promise<TableKey[]> {
    return await this.getOutgoingKeys(table, schema);
  }

  /**
   * Get all foreign keys **defined by** the given table (outgoing relations).
   */
  abstract getOutgoingKeys(_table: string, _schema?: string): Promise<TableKey[]>;

  /**
   * Get all foreign keys that **reference** the given table (incoming relations).
   */
  abstract getIncomingKeys(_table: string, _schema?: string): Promise<TableKey[]>;

  listTablePartitions(_table: string, _schema?: string): Promise<TablePartition[]> {
    return Promise.resolve([])
  }

  executeCommand(_commandText: string): Promise<NgQueryResult[]> {
    return Promise.resolve([]);
  }

  abstract query(queryText: string, tabId: number, options?: any): Promise<CancelableQuery>;
  abstract executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]>;
  abstract listDatabases(filter?: DatabaseFilterOptions): Promise<string[]>;
  abstract getTableProperties(table: string, schema?: string): Promise<TableProperties | null>;
  abstract getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string>;
  abstract listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]>;
  abstract getPrimaryKey(table: string, schema?: string): Promise<string | null>;
  abstract getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]>;
  // ****************************************************************************

  // Create Structure ***********************************************************
  abstract listCharsets(): Promise<string[]>
  abstract getDefaultCharset(): Promise<string>
  abstract listCollations(charset: string): Promise<string[]>
  abstract createDatabase(databaseName: string, charset: string, collation: string): Promise<string>
  abstract createDatabaseSQL(): Promise<string>
  abstract getTableCreateScript(table: string, schema?: string): Promise<string>;
  abstract getViewCreateScript(view: string, schema?: string): Promise<string[]>;
  async getMaterializedViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    return [];
  }
  abstract getRoutineCreateScript(routine: string, type: string, schema?: string): Promise<string[]>;

  // This is just for Mongo, calling it createTable in case we want to use it for other dbs in the future
  async createTable(_table: CreateTableSpec): Promise<void> {
    return Promise.resolve();
  }

  // MongoDB-specific schema validation methods
  async getCollectionValidation(_collection: string): Promise<any> {
    log.debug('getCollectionValidation is only implemented for MongoDB');
    return Promise.resolve(null);
  }

  async getServerStatistics(): Promise<ServerStatistics | null> {
    return null;
  }

  async setCollectionValidation(_params: any): Promise<void> {
    log.debug('setCollectionValidation is only implemented for MongoDB');
    return Promise.resolve();
  }
  // ****************************************************************************

  // Make Changes ***************************************************************
  // all of these can be handled by the change builder, which we can get for any connection
  async alterTableSql(change: AlterTableSpec): Promise<string> {
    const { table, schema } = change
    const builder = await this.getBuilder(table, schema)
    return builder.alterTable(change)
  }

  async alterTable(change: AlterTableSpec): Promise<void> {
    const sql = await this.alterTableSql(change)
    await this.executeQuery(sql)
  }

  async alterIndexSql(changes: IndexAlterations): Promise<string | null> {
    const { table, schema, additions, drops } = changes
    const changeBuilder = await this.getBuilder(table, schema)
    const newIndexes = changeBuilder.createIndexes(additions)
    const droppers = changeBuilder.dropIndexes(drops)
    return [newIndexes, droppers].filter((f) => !!f).join(";")
  }

  async alterIndex(changes: IndexAlterations): Promise<void> {
    const sql = await this.alterIndexSql(changes);
    await this.executeQuery(sql)
  }

  async alterRelationSql(changes: RelationAlterations): Promise<string | null> {
    const { table, schema } = changes
    const builder = await this.getBuilder(table, schema)
    const creates = builder.createRelations(changes.additions)
    const drops = builder.dropRelations(changes.drops)
    return [creates, drops].filter((f) => !!f).join(";")
  }

  async alterRelation(changes: RelationAlterations): Promise<void> {
    const query = await this.alterRelationSql(changes)
    await this.executeQuery(query)
  }

  async alterPartitionSql(_changes: AlterPartitionsSpec): Promise<string | null> {
    return ''
  }

  async alterPartition(_changes: AlterPartitionsSpec): Promise<void> {
    return;
  }

  async applyChangesSql(changes: TableChanges): Promise<string> {
    await this.deserializeTableChanges(changes);
    return applyChangesSql(changes, this.knex);
  }

  async applyChanges(changes: TableChanges): Promise<TableUpdateResult[]> {
    await this.deserializeTableChanges(changes);
    return await this.executeApplyChanges(changes);
  }

  abstract executeApplyChanges(changes: TableChanges): Promise<TableUpdateResult[]>;

  abstract setTableDescription(table: string, description: string, schema?: string): Promise<string>;

  abstract setElementNameSql(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<string>;

  async setElementName(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    const sql = await this.setElementNameSql(elementName, newElementName, typeOfElement, schema)
    if (!sql) {
      throw new Error(`Cannot rename element ${elementName} to ${newElementName} of type ${typeOfElement}`);
    }
    await this.driverExecuteSingle(sql);
  }

  abstract dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void>;

  abstract truncateElementSql(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<string>;

  async truncateElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    const sql = await this.truncateElementSql(elementName, typeOfElement, schema);
    if (!sql) {
      throw new Error(`Cannot truncate element ${elementName} of type ${typeOfElement}`);
    }
    await this.driverExecuteSingle(sql);
  }

  abstract truncateAllTables(schema?: string): Promise<void>;
  // ****************************************************************************

  // ****************************************************************************
  // ****************************************************************************

  // For TableTable *************************************************************
  abstract getTableLength(table?: string, schema?: string): Promise<number>;
  abstract selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult>;
  abstract selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string>;
  abstract selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults>;
  // ****************************************************************************

  // For Export *****************************************************************
  abstract queryStream(query: string, chunkSize: number): Promise<StreamResults>;
  // ****************************************************************************

  // For Import *****************************************************************
  async importStepZero(_table: TableOrView, _options?: { connection: any }): Promise<any> {
    return null
  }
  async importBeginCommand(_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    return null
  }

  async importTruncateCommand (_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    return null
  }

  async importLineReadCommand (_table: TableOrView, _sqlString: string|string[], _importOptions?: ImportFuncOptions): Promise<any> {
    return null
  }

  async importCommitCommand (_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    return null
  }

  async importRollbackCommand (_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    return null
  }

  async importFinalCommand (_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    return null
  }

  protected async runWithConnection<T>(_child: (c: any) => Promise<T>): Promise<T> {
    throw new Error(`runWithConnection not implemented for ${this.dialect}`);
  }

  async importFile(
    table: TableOrView,
    importScriptOptions: ImportFuncOptions,
    readStream: (b: {[key: string]: any}, executeOptions?: any, c?: string) => Promise<any>,
    createTableSql?: string
  ) {
    const {
      executeOptions,
      importerOptions,
      storeValues
    } = importScriptOptions;

    return await this.runWithConnection(async (connection) => {
      try {
        executeOptions.connection = connection
        importScriptOptions.clientExtras = await this.importStepZero(table, { connection })
        await this.importBeginCommand(table, importScriptOptions)
        if (storeValues.createNewTable) {
          await this.rawExecuteQuery(createTableSql, {}) as RawResultType[]
        }
        if (storeValues.truncateTable) {
          await this.importTruncateCommand(table, importScriptOptions)
        }

        const readOptions = {
          connection,
          ...importScriptOptions.clientExtras
        };
        const result = await readStream(importerOptions, readOptions, storeValues.fileName)
        if (result.aborted) {
          throw new Error(`Import aborted: ${result.error}`);
        }
        await this.importCommitCommand(table, importScriptOptions)
      } catch (err) {
        log.error('Error importing data: ', err)
        await this.importRollbackCommand(table, importScriptOptions)
        throw err;
      } finally {
        await this.importFinalCommand(table, importScriptOptions)
      }
    })
  }

  async getImportSQL(importedData: any[], tableName: string, schema: string = null, runAsUpsert = false): Promise<string | string[]> {
    const queries = []
    const primaryKeysPromise = await this.getPrimaryKeys(tableName, schema)
    const primaryKeys = primaryKeysPromise.map(v => v.columnName)
    const createUpsertFunc = this.createUpsertFunc ?? null
    queries.push(buildInsertQueries(this.knex, importedData, { runAsUpsert, primaryKeys, createUpsertFunc }).join(';'))
    return joinQueries(queries)
  }
  // ****************************************************************************

  // Duplicate Table ************************************************************
  abstract duplicateTable(tableName: string, duplicateTableName: string, schema?: string): Promise<void>;
  abstract duplicateTableSql(tableName: string, duplicateTableName: string, schema?: string): Promise<string>;
  // ****************************************************************************

  /** Sync a database file to remote database. This is a LibSQL specific feature. */
  async syncDatabase(): Promise<void> {
    throw new Error("Not implemented");
  }

  protected createUpsertFunc: ((table: DatabaseEntity, data: {[key: string]: any}, primaryKey: string[]) => string) | null = null

  async getInsertQuery(tableInsert: TableInsert, runAsUpsert = false): Promise<string> {
    const columns = await this.listTableColumns(tableInsert.table, tableInsert.schema);
    tableInsert.data.forEach((row) => {
      Object.keys(row).forEach((key) => {
        row[key] = this.deserializeValue(row[key]);
      })
    })
    const primaryKeysPromise = await this.getPrimaryKeys(tableInsert.table, tableInsert.schema)
    const primaryKeys = primaryKeysPromise.map(v => v.columnName)
    return buildInsertQuery(this.knex, tableInsert, { columns, runAsUpsert, primaryKeys, createUpsertFunc: this.createUpsertFunc });
  }

  abstract wrapIdentifier(value: string): string;

  // structure to allow logging of all queries to a query log
  protected abstract rawExecuteQuery(q: string, options: any): Promise<RawResultType | RawResultType[]>

  protected async checkIsConnected(): Promise<boolean> {
    try {
      await this.rawExecuteQuery('SELECT 1', {});
      return true;
    } catch (_e) {
      return false;
    }
  }

  async getColumnsAndTotalRows(query: string): Promise<ColumnsAndTotalRows> {
    const [result] = await this.executeQuery(query)
    const {fields, rowCount: totalRows} = result
    const columns = fields.map(f => ({
      columnName: f.name,
      dataType: f.dataType
    }))

    return {
      columns,
      totalRows
    }
  }

  protected abstract parseTableColumn(column: any): BksField

  protected parseQueryResultColumns(qr: RawResultType): BksField[] {
    return qr.columns.map((c) => ({
      name: c.name,
      bksType: "UNKNOWN",
    }));
  }

  /** Serializes and mutates an array of rows based on their fields */
  protected async serializeQueryResult(qr: RawResultType, fields: BksField[]): Promise<Record<string, any>[]> {
    // No transcoders, just return the raw result
    if (this.transcoders.length === 0) {
      return qr.rows;
    }

    const fieldTranscoders: Record<string, Transcoder<any, any>> = {}

    // Find transcoders by fields
    fields.forEach((field, idx) => {
      this.transcoders.forEach((transcoder) => {
        if (transcoder.serializeCheckByField(field)) {
          fieldTranscoders[qr.arrayMode ? idx : field.name] = transcoder
        }
      })
    })

    // Mutate rows based on the found transcoders
    for (const row of qr.rows) {
      Object.entries(fieldTranscoders).forEach(([key, transcoder]) => {
        row[key] = transcoder.serialize(row[key])
      })
    }

    return qr.rows;
  }

  protected async deserializeTableChanges(changes: TableChanges) {
    // No transcoders, just return the raw result
    if (this.transcoders.length === 0) {
      return changes
    }

    changes.inserts?.forEach((ins) => {
      ins.data.forEach((row) => {
        Object.keys(row).forEach((key) => {
          row[key] = this.deserializeValue(row[key])
        })
      })
    })

    changes.updates?.forEach((upd) => {
      upd.primaryKeys.forEach((pk) => {
        pk.value = this.deserializeValue(pk.value)
      })
      upd.value = this.deserializeValue(upd.value)
    })

    changes.deletes?.forEach((del) => {
      del.primaryKeys.forEach((pk) => {
        pk.value = this.deserializeValue(pk.value)
      })
    })
  }

  private deserializeValue(value: any) {
    const transcoder = this.transcoders.find((t) => t.deserializeCheckByValue(value))
    return transcoder?.deserialize(value) || value
  }

  protected violatesReadOnly(statements: IdentifyResult[], options: any = {}) {
    return !isAllowedReadOnlyQuery(statements, this.readOnlyMode) && !options.overrideReadonly
  }

  async driverExecuteSingle(q: string, options: any = {}): Promise<RawResultType> {
    const statements = identify(q, { strict: false, dialect: this.dialect });
    if (await this.checkAllowReadOnly() && this.violatesReadOnly(statements, options)) {
      throw new Error(errorMessages.readOnly);
    }

    const logOptions: QueryLogOptions = { options, status: 'completed'}
    // force rawExecuteQuery to return a single result
    options['multiple'] = false
    options['statements'] = statements
    try {
        const result = await this.rawExecuteQuery(q, options) as RawResultType
        return _.isArray(result) ? result[0] : result
    } catch (ex) {
        // if (!await this.checkIsConnected()) {
        //   try {
        //     await this.connect();
        //   } catch (_e) {
        //     // may need better error message
        //     this.connErrHandler('It seems we have lost the connection to the database.');
        //     return;
        //   }
        //   const result = await this.rawExecuteQuery(q, options) as RawResultType;
        //   return _.isArray(result) ? result[0] : result
        // }

        logOptions.status = 'failed'
        logOptions.error = ex.message
        throw ex;
    } finally {
        this.contextProvider.logQuery(q, logOptions, this.contextProvider.getExecutionContext())
    }
  }

  async driverExecuteMultiple(q: string, options: any = {}): Promise<RawResultType[]> {
    const statements = identify(q, { strict: false, dialect: this.dialect });
    if (await this.checkAllowReadOnly() && this.violatesReadOnly(statements, options)) {
      throw new Error(errorMessages.readOnly);
    }

    const logOptions: QueryLogOptions = { options, status: 'completed' }
    // force rawExecuteQuery to return an array
    options['multiple'] = true;
    options['statements'] = statements
    try {
      const result = await this.rawExecuteQuery(q, options) as RawResultType[]
      return result
    } catch (ex) {
      // if (!await this.checkIsConnected()) {
      //   try {
      //     await this.connect();
      //   } catch (_e) {
      //     // may need better error message
      //     this.connErrHandler('It seems we have lost the connection to the database.');
      //     return;
      //   }
      //   const result = await this.rawExecuteQuery(q, options) as RawResultType;
      //   return _.isArray(result) ? result[0] : result
      // }
      logOptions.status = 'failed'
      logOptions.error = ex.message
      throw ex;
    } finally {
      this.contextProvider.logQuery(q, logOptions, this.contextProvider.getExecutionContext())
    }
  }

  async getFilteredDataCount(table: string, schema: string | null, filter: string ): Promise<string> {
    if (!this.knex) {
      return ''
    }

    try {
      const query = await this.knex(schema ? `${schema}.${table}` : table)
        .count('*')
        .whereRaw(filter)
        .toString()

      const { rows } = await this.driverExecuteSingle(query)
      const [dataCount] = rows
      const [countKey] = Object.keys(dataCount)

      return dataCount[countKey]
    } catch (err) {
      log.error(err)
      return ''
    }
  }

  async getQueryForFilter(filter: TableFilter): Promise<string> {
    if (!this.knex) {
      log.warn("No knex instance found. Cannot get query for filter.");
      return ""
    }

    let queryBuilder: Knex.QueryBuilder;

    if (filter.type == 'is') {
      queryBuilder = this.knex.whereNull(filter.field);
    } else if (filter.type == 'is not') {
      queryBuilder = this.knex.whereNotNull(filter.field);
    } else {
      queryBuilder = this.knex.where(filter.field, filter.type, filter.value);
    }

    return queryBuilder.toString()
      .split("where")[1]
      .trim();
  }

  // Manual transaction management
  async reserveConnection(_tabId: number): Promise<void> {}
  async releaseConnection(_tabId: number): Promise<void> {}
  async startTransaction(_tabId: number): Promise<void> {}
  async commitTransaction(_tabId: number): Promise<void> {}
  async rollbackTransaction(_tabId: number): Promise<void> {}

  /** @throws Will throw if the `tabId` is already reserved */
  protected throwIfHasConnection(tabId: number) {
    if (this.reservedConnections.has(tabId)) {
      throw new Error("Tab has already reserved a connection from the pool");
    }
  }

  protected pushConnection(tabId: number, conn: Conn) {
    this.reservedConnections.set(tabId, conn);
  }

  protected popConnection(tabId: number): Conn {
    if (!this.reservedConnections.has(tabId)) {
      return null
    }

    const conn = this.reservedConnections.get(tabId);
    this.reservedConnections.delete(tabId);
    return conn;
  }

  protected peekConnection(tabId: number): Conn {
    if (!this.reservedConnections.get(tabId)) {
      throw new Error("Could not retrieve reserved connection, please report this issue on our GitHub.");
    }
    return this.reservedConnections.get(tabId);
  }
}
