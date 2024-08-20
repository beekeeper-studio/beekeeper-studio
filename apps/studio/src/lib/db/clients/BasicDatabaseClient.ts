import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, SchemaFilterOptions, DatabaseFilterOptions, TableChanges, OrderBy, TableFilter, TableResult, StreamResults, CancelableQuery, ExtendedTableColumn, PrimaryKeyColumn, TableProperties, TableIndex, TableTrigger, TableInsert, NgQueryResult, TablePartition, TableUpdateResult, ImportScriptFunctions, DatabaseEntity } from '../models';
import { AlterPartitionsSpec, AlterTableSpec, IndexAlterations, RelationAlterations, TableKey } from '@shared/lib/dialects/models';
import { buildInsertQueries, buildInsertQuery, errorMessages, isAllowedReadOnlyQuery, joinQueries } from './utils';
import { Knex } from 'knex';
import _ from 'lodash'
import { ChangeBuilderBase } from '@shared/lib/sql/change_builder/ChangeBuilderBase';
import { identify } from 'sql-query-identifier';
import { ConnectionType, DatabaseElement, IBasicDatabaseClient, IDbConnectionDatabase } from '../types';
import rawLog from "electron-log";
import connectTunnel from '../tunnel';
import { IDbConnectionServer } from '../backendTypes';

const log = rawLog.scope('db');
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

// raw result type is specific to each database implementation
export abstract class BasicDatabaseClient<RawResultType> implements IBasicDatabaseClient {
  knex: Knex | null;
  contextProvider: AppContextProvider;
  dialect: "mssql" | "sqlite" | "mysql" | "oracle" | "psql" | "bigquery" | "generic";
  // TODO (@day): this can be cleaned up when we fix configuration
  readOnlyMode = false;
  server: IDbConnectionServer;
  database: IDbConnectionDatabase;
  db: string;
  connectionBaseType: ConnectionType;
  connectionType: ConnectionType;
  connErrHandler: (msg: string) => void = null;

  constructor(knex: Knex | null, contextProvider: AppContextProvider, server: IDbConnectionServer, database: IDbConnectionDatabase) {
    this.knex = knex;
    this.contextProvider = contextProvider
    this.server = server;
    this.database = database;
    this.db = database?.database
    this.connectionType = this.server?.config.client;
  }

  set connectionHandler(fn: (msg: string) => void) {
    this.connErrHandler = fn;
  }

  abstract getBuilder(table: string, schema?: string): ChangeBuilderBase

  // DB Metadata ****************************************************************
  abstract supportedFeatures(): Promise<SupportedFeatures>;
  abstract versionString(): Promise<string>;

  async defaultSchema(): Promise<string | null> {
    return null
  }
  // ****************************************************************************

  // Connection *****************************************************************
  async connect(): Promise<void> {
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
    await this.knex.destroy();
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
  abstract getTableKeys(table: string, schema?: string): Promise<TableKey[]>;

  listTablePartitions(_table: string, _schema?: string): Promise<TablePartition[]> {
    return Promise.resolve([])
  }

  abstract query(queryText: string, options?: any): Promise<CancelableQuery>;
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
  abstract createDatabase(databaseName: string, charset: string, collation: string): Promise<void>
  abstract createDatabaseSQL(): Promise<string>
  abstract getTableCreateScript(table: string, schema?: string): Promise<string>;
  abstract getViewCreateScript(view: string, schema?: string): Promise<string[]>;
  async getMaterializedViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    return [];
  }
  abstract getRoutineCreateScript(routine: string, type: string, schema?: string): Promise<string[]>;
  // ****************************************************************************

  // Make Changes ***************************************************************
  // all of these can be handled by the change builder, which we can get for any connection
  async alterTableSql(change: AlterTableSpec): Promise<string> {
    const { table, schema } = change
    const builder = this.getBuilder(table, schema)
    return builder.alterTable(change)
  }

  async alterTable(change: AlterTableSpec): Promise<void> {
    const sql = await this.alterTableSql(change)
    await this.executeQuery(sql)
  }

  async alterIndexSql(changes: IndexAlterations): Promise<string | null> {
    const { table, schema, additions, drops } = changes
    const changeBuilder = this.getBuilder(table, schema)
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
    const builder = this.getBuilder(table, schema)
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

  abstract applyChangesSql(changes: TableChanges): Promise<string>;

  abstract applyChanges(changes: TableChanges): Promise<TableUpdateResult[]>;

  abstract setTableDescription(table: string, description: string, schema?: string): Promise<string>;

  abstract setElementNameSql(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<string>;

  async setElementName(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    const sql = await this.setElementNameSql(elementName, newElementName, typeOfElement, schema)
    if (!sql) {
      throw new Error(`Unsupported element type: ${typeOfElement}`);
    }
    await this.executeQuery(sql);
  }

  abstract dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void>;

  abstract truncateElementSql(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<string>;

  async truncateElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    const sql = this.truncateElementSql(elementName, typeOfElement, schema);
    if (!sql) {
      throw new Error(`Cannot truncate element ${elementName} of type ${typeOfElement}`);
    }
    await this.driverExecuteSingle(await this.truncateElementSql(elementName, typeOfElement, schema));
  }

  abstract truncateAllTables(schema?: string): Promise<void>;
  // ****************************************************************************

  // ****************************************************************************
  // ****************************************************************************

  // For TableTable *************************************************************
  abstract getTableLength(table: string, schema?: string): Promise<number>;
  abstract selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult>;
  abstract selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string>;
  abstract selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults>;
  // ****************************************************************************

  // For Export *****************************************************************
  abstract queryStream(query: string, chunkSize: number): Promise<StreamResults>;
  // ****************************************************************************

  // For Import *****************************************************************
  getImportScripts(_table: TableOrView): ImportScriptFunctions {
    return {
      step0: (): Promise<any|null> => null,
      beginCommand: (_executeOptions: any): any => null,
      truncateCommand: (): Promise<any> => null,
      lineReadCommand: (_sqlString: string[]): Promise<any> => null,
      commitCommand: (_executeOptions: any): Promise<any> => null,
      rollbackCommand: (_executeOptions: any): Promise<any> => null,
      finalCommand: (_executeOptions: any): Promise<any> => null
    }
  }

  getImportSQL(importedData: any[], primaryKeys: string[] = []): string | string[] {
    const queries = []
    queries.push(buildInsertQueries(this.knex, importedData, { runAsUpsert: true, primaryKeys }).join(';'))
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

  async driverExecuteSingle(q: string, options: any = {}): Promise<RawResultType> {
    const identification = identify(q, { strict: false, dialect: this.dialect });
    if (!isAllowedReadOnlyQuery(identification, this.readOnlyMode) && !options.overrideReadonly) {
      throw new Error(errorMessages.readOnly);
    }

    const logOptions: QueryLogOptions = { options, status: 'completed'}
    // force rawExecuteQuery to return a single result
    options['multiple'] = false
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
    const identification = identify(q, { strict: false, dialect: this.dialect });
    if (!isAllowedReadOnlyQuery(identification, this.readOnlyMode) && !options.overrideReadonly) {
      throw new Error(errorMessages.readOnly);
    }
    
    const logOptions: QueryLogOptions = { options, status: 'completed' }
    // force rawExecuteQuery to return an array
    options['multiple'] = true;
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

}
