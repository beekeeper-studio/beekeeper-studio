import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, SchemaFilterOptions, DatabaseFilterOptions, TableChanges, OrderBy, TableFilter, TableResult, StreamResults, CancelableQuery, ExtendedTableColumn, PrimaryKeyColumn, TableProperties, TableIndex, TableTrigger, TableInsert, NgQueryResult, TablePartition, TableUpdateResult } from '../models';
import { AlterPartitionsSpec, AlterTableSpec, IndexAlterations, RelationAlterations, TableKey } from '@shared/lib/dialects/models';
import { buildInsertQuery } from './utils';
import { Knex } from 'knex';
import { ChangeBuilderBase } from '@shared/lib/sql/change_builder/ChangeBuilderBase';
import { ConnectionType, DatabaseElement, IDbConnectionDatabase, IDbConnectionServer } from '../types';
import createLogger from '@/lib/logger';
import connectTunnel from '../tunnel';

const logger = createLogger('db');

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


// this provides the ability to get the current tab information, plus provides
// a way to log the data to a table in the app sqlite.
// this is a useful design if BKS ever gains a web version.
// it returns an ID to use
export interface AppContextProvider {
    getExecutionContext(): ExecutionContext
    logQuery(query: string, options: QueryLogOptions, context: ExecutionContext ): Promise<number | string>
}

// raw result type is specific to each database implementation
export abstract class BasicDatabaseClient<RawResultType> {

  knex: Knex | null;
  contextProvider: AppContextProvider
  server: IDbConnectionServer;
  database: IDbConnectionDatabase;
  connectionType: ConnectionType;

  constructor(knex: Knex | null, contextProvider: AppContextProvider, server: IDbConnectionServer, database: IDbConnectionDatabase) {
    this.knex = knex;
    this.contextProvider = contextProvider
    this.server = server;
    this.database = database;
    this.connectionType = this.server?.config.client;
  }

  abstract getBuilder(table: string, schema?: string): ChangeBuilderBase

  // DB Metadata ****************************************************************
  abstract supportedFeatures(): SupportedFeatures;
  abstract versionString(): string;
  defaultSchema(): string | null {
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
        this.disconnect();
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
      this.server.sshTunnel.connection.shutdown();
    }

    if (this.server.db[this.database.database]) {
      delete this.server.db[this.database.database]
    }
  }
  // ****************************************************************************

  // List schema information ****************************************************
  abstract listTables(db: string, filter?: FilterOptions): Promise<TableOrView[]>;
  abstract listViews(filter?: FilterOptions): Promise<TableOrView[]>;
  abstract listRoutines(filter?: FilterOptions): Promise<Routine[]>;
  abstract listMaterializedViewColumns(db: string, table: string, schema?: string): Promise<TableColumn[]>;
  abstract listTableColumns(db: string, table?: string, schema?: string): Promise<ExtendedTableColumn[]>;
  abstract listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]>;
  abstract listTableIndexes(db: string, table: string, schema?: string): Promise<TableIndex[]>;
  abstract listSchemas(db: string, filter?: SchemaFilterOptions): Promise<string[]>;
  abstract getTableReferences(table: string, schema?: string): Promise<string[]>;
  abstract getTableKeys(db: string, table: string, schema?: string): Promise<TableKey[]>;

  listTablePartitions(_table: string, _schema?: string): Promise<TablePartition[]> {
    return Promise.resolve([])
  }

  abstract query(queryText: string, options?: any): CancelableQuery;
  abstract executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]>;
  abstract listDatabases(filter?: DatabaseFilterOptions): Promise<string[]>;
  abstract getTableProperties(table: string, schema?: string): Promise<TableProperties | null>;
  abstract getQuerySelectTop(table: string, limit: number, schema?: string): string;
  abstract listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]>;
  abstract getPrimaryKey(db: string, table: string, schema?: string): Promise<string | null>;
  abstract getPrimaryKeys(db: string, table: string, schema?: string): Promise<PrimaryKeyColumn[]>;
  // ****************************************************************************

  // Create Structure ***********************************************************
  abstract listCharsets(): Promise<string[]>
  abstract getDefaultCharset(): Promise<string>
  abstract listCollations(charset: string): Promise<string[]>
  abstract createDatabase(databaseName: string, charset: string, collation: string): Promise<void>
  abstract createDatabaseSQL(): string
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

  alterIndexSql(changes: IndexAlterations): string | null {
    const { table, schema, additions, drops } = changes
    const changeBuilder = this.getBuilder(table, schema)
    const newIndexes = changeBuilder.createIndexes(additions)
    const droppers = changeBuilder.dropIndexes(drops)
    return [newIndexes, droppers].filter((f) => !!f).join(";")
  }

  async alterIndex(changes: IndexAlterations): Promise<void> {
    const sql = this.alterIndexSql(changes);
    await this.executeQuery(sql)
  }

  alterRelationSql(changes: RelationAlterations): string | null {
    const { table, schema } = changes
    const builder = this.getBuilder(table, schema)
    const creates = builder.createRelations(changes.additions)
    const drops = builder.dropRelations(changes.drops)
    return [creates, drops].filter((f) => !!f).join(";")
  }

  async alterRelation(changes: RelationAlterations): Promise<void> {
    const query = this.alterRelationSql(changes)
    await this.executeQuery(query)
  }

  alterPartitionSql(_changes: AlterPartitionsSpec): string | null {
    return ''
  }

  async alterPartition(_changes: AlterPartitionsSpec): Promise<void> {
    return;
  }

  abstract applyChangesSql(changes: TableChanges): string;

  abstract applyChanges(changes: TableChanges): Promise<TableUpdateResult[]>;

  abstract setTableDescription(table: string, description: string, schema?: string): Promise<string>;

  abstract dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void>;

  abstract truncateElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void>;

  abstract truncateAllTables(db: string, schema?: string): void;
  // ****************************************************************************

  // ****************************************************************************
  // ****************************************************************************

  // For TableTable *************************************************************
  abstract getTableLength(table: string, schema?: string): Promise<number>;
  abstract selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult>;
  abstract selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string>;
  abstract selectTopStream(db: string, table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults>;
  // ****************************************************************************

  // For Export *****************************************************************
  abstract queryStream(db: string, query: string, chunkSize: number): Promise<StreamResults>;
  // ****************************************************************************

  // Duplicate Table ************************************************************
  abstract duplicateTable(tableName: string, duplicateTableName: string, schema?: string): Promise<void>;
  abstract duplicateTableSql(tableName: string, duplicateTableName: string, schema?: string): string;
  // ****************************************************************************

  async getInsertQuery(tableInsert: TableInsert): Promise<string> {
    const columns = await this.listTableColumns(null, tableInsert.table, tableInsert.schema);
    return buildInsertQuery(this.knex, tableInsert, columns);
  }

  abstract wrapIdentifier(value: string): string;

  // structure to allow logging of all queries to a query log
  protected abstract rawExecuteQuery(q: string, options: any): Promise<RawResultType | RawResultType[]>

  async driverExecuteSingle(q: string, options: any = {}): Promise<RawResultType> {
    const logOptions: QueryLogOptions = { options, status: 'completed'}
    // force rawExecuteQuery to return a single result
    options['multiple'] = false
    try {
        const result = await this.rawExecuteQuery(q, options) as RawResultType
        return result
    } catch (ex) {
        logOptions.status = 'failed'
        logOptions.error = ex.message
        throw ex;
    } finally {
        this.contextProvider.logQuery(q, logOptions, this.contextProvider.getExecutionContext())
    }
  }

  async driverExecuteMultiple(q: string, options: any = {}): Promise<RawResultType[]> {
    const logOptions: QueryLogOptions = { options, status: 'completed' }
    // force rawExecuteQuery to return an array
    options['multiple'] = true;
    try {
      const result = await this.rawExecuteQuery(q, options) as RawResultType[]
      return result
    } catch (ex) {
      logOptions.status = 'failed'
      logOptions.error = ex.message
      throw ex;
    } finally {
      this.contextProvider.logQuery(q, logOptions, this.contextProvider.getExecutionContext())
    }
  }

  


}
