import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, SchemaFilterOptions, DatabaseFilterOptions, TableChanges, OrderBy, TableFilter, TableResult, StreamResults, CancelableQuery, ExtendedTableColumn, PrimaryKeyColumn, TableProperties, TableIndex, TableTrigger, TableInsert, NgQueryResult, TablePartition } from '../models';
import { AlterPartitionsSpec, AlterTableSpec, IndexAlterations, RelationAlterations, TableKey } from '@shared/lib/dialects/models';
import { buildInsertQuery, errorMessages, isAllowedReadOnlyQuery } from './utils';
import { Knex } from 'knex';
import { DatabaseClient, DatabaseElement } from '../client';
import { ChangeBuilderBase } from '@shared/lib/sql/change_builder/ChangeBuilderBase';
import { identify } from 'sql-query-identifier';

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
export abstract class BasicDatabaseClient<RawResultType> implements DatabaseClient {

  knex: Knex | null;
  contextProvider: AppContextProvider;
  dialect: "mssql" | "sqlite" | "mysql" | "oracle" | "psql" | "bigquery" | "generic";
  // TODO (@day): this can be cleaned up when we fix configuration
  dbReadOnlyMode = false;

  constructor(knex: Knex | null, contextProvider: AppContextProvider) {
    this.knex = knex;
    this.contextProvider = contextProvider
  }
  listTablePartitions(_table: string, _schema: string): Promise<TablePartition[]> {
    return Promise.resolve([])
  }
  alterPartitionSql(_changes: AlterPartitionsSpec): string {
    return ''
  }

  async alterPartition(_changes: AlterPartitionsSpec): Promise<void> {
    return;
  }

  async getMaterializedViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    return [];
  }

  abstract versionString(): string;

  defaultSchema(): string | null {
    return null
  }

  abstract getBuilder(table: string, schema?: string): ChangeBuilderBase

  abstract supportedFeatures(): SupportedFeatures;
  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>;
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
  abstract query(queryText: string): CancelableQuery;
  abstract executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]>;
  abstract listDatabases(filter?: DatabaseFilterOptions): Promise<string[]>;
  abstract applyChangesSql(changes: TableChanges): string;
  abstract applyChanges(changes: TableChanges): Promise<any[]>;
  abstract getQuerySelectTop(table: string, limit: number, schema?: string): string;
  abstract getTableProperties(table: string, schema?: string): Promise<TableProperties>;
  abstract getTableCreateScript(table: string, schema?: string): Promise<string>;
  abstract getViewCreateScript(view: string, schema?: string): Promise<string[]>;
  abstract getRoutineCreateScript(routine: string, type: string, schema?: string): Promise<string[]>;
  abstract truncateAllTables(db: string, schema?: string): void;
  abstract listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]>;
  abstract getPrimaryKey(db: string, table: string, schema?: string): Promise<string | null>;
  abstract getPrimaryKeys(db: string, table: string, schema?: string): Promise<PrimaryKeyColumn[]>;
  abstract getTableLength(table: string, schema?: string): Promise<number>;
  abstract selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult>;
  abstract selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string>;
  abstract selectTopStream(db: string, table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults>;
  abstract queryStream(db: string, query: string, chunkSize: number): Promise<StreamResults>;
  abstract wrapIdentifier(value: string): string;
  abstract setTableDescription(table: string, description: string, schema?: string): Promise<string>;
  abstract dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void>;
  abstract truncateElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void>;
  abstract duplicateTable(tableName: string, duplicateTableName: string, schema?: string): Promise<void>;
  abstract duplicateTableSql(tableName: string, duplicateTableName: string, schema?: string): string;
  // db creation
  abstract listCharsets(): Promise<string[]>
  abstract getDefaultCharset(): Promise<string>
  abstract listCollations(charset: string): Promise<string[]>
  abstract createDatabase(databaseName: string, charset: string, collation: string): void
  abstract createDatabaseSQL(): string

  // import to table from file
  abstract importData(sql: string): Promise<any>;
  abstract getImportSQL(importedData: TableInsert[], isTruncate: boolean): string;


  // structure to allow logging of all queries to a query log
  protected abstract rawExecuteQuery(q: string, options: any): Promise<RawResultType | RawResultType[]>

  async driverExecuteSingle(q: string, options: any = {}): Promise<RawResultType> {
    const identification = identify(q, { strict: false, dialect: this.dialect });
    if (!isAllowedReadOnlyQuery(identification, this.dbReadOnlyMode)) {
      throw new Error(errorMessages.readOnly);
    }

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
    const identification = identify(q, { strict: false, dialect: this.dialect });
    if (!isAllowedReadOnlyQuery(identification, this.dbReadOnlyMode)) {
      throw new Error(errorMessages.readOnly);
    }

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

  async getInsertQuery(tableInsert: TableInsert): Promise<string> {
    const columns = await this.listTableColumns(null, tableInsert.table, tableInsert.schema);
    return buildInsertQuery(this.knex, tableInsert, columns);
  }

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
  alterIndexSql(changes: IndexAlterations): string {
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

  alterRelationSql(changes: RelationAlterations): string {
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

}
