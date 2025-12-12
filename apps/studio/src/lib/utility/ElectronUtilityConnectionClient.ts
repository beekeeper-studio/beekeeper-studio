import { DatabaseElement, IBasicDatabaseClient } from "../db/types";
import Vue from 'vue';
import { CancelableQuery, DatabaseFilterOptions, ExtendedTableColumn, FilterOptions, NgQueryResult, OrderBy, PrimaryKeyColumn, Routine, SchemaFilterOptions, SupportedFeatures, TableChanges, TableFilter, TableColumn, TableIndex, TableOrView, TablePartition, TableResult, TableProperties, StreamResults, TableInsert, TableTrigger, ImportFuncOptions } from "../db/models";
import { AlterPartitionsSpec, AlterTableSpec, CreateTableSpec, IndexAlterations, RelationAlterations, TableKey } from "@shared/lib/dialects/models";
import { IConnection } from "@/common/interfaces/IConnection";


export class ElectronUtilityConnectionClient implements IBasicDatabaseClient {
  async supportedFeatures(): Promise<SupportedFeatures> {
    return await Vue.prototype.$util.send('conn/supportedFeatures', {})
  }

  async versionString(): Promise<string> {
    return await Vue.prototype.$util.send('conn/versionString', {});
  }

  async defaultSchema(): Promise<string> {
    return await Vue.prototype.$util.send('conn/defaultSchema', {});
  }

  async listCharsets(): Promise<string[]> {
    return await Vue.prototype.$util.send('conn/listCharsets', {});
  }

  async getDefaultCharset(): Promise<string> {
    return await Vue.prototype.$util.send('conn/getDefaultCharset', {});
  }

  async listCollations(charset: string): Promise<string[]> {
    return await Vue.prototype.$util.send('conn/listCollations', { charset });
  }

  async connect(): Promise<void> {
    return await Vue.prototype.$util.send('conn/connect', {});
  }

  async disconnect(): Promise<void> {
    return await Vue.prototype.$util.send('conn/disconnect', {});
  }

  async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    return await Vue.prototype.$util.send('conn/listTables', { filter });
  }

  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    return await Vue.prototype.$util.send('conn/listViews', { filter });
  }

  async listRoutines(filter?: FilterOptions): Promise<Routine[]> {
    return await Vue.prototype.$util.send('conn/listRoutines', { filter });
  }

  async listMaterializedViewColumns(table: string, schema?: string): Promise<TableColumn[]> {
    return await Vue.prototype.$util.send('conn/listMaterializedViewColumns', { table, schema })
  }

  async listTableColumns(table: string, schema?: string, database?: string): Promise<ExtendedTableColumn[]> {
    return await Vue.prototype.$util.send('conn/listTableColumns', { table, schema, database });
  }

  async listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]> {
    return await Vue.prototype.$util.send('conn/listTableTriggers', { table, schema });
  }

  async listTableIndexes(table: string, schema?: string): Promise<TableIndex[]> {
    return await Vue.prototype.$util.send('conn/listTableIndexes', { table, schema });
  }

  async listSchemas(filter?: SchemaFilterOptions): Promise<string[]> {
    return await Vue.prototype.$util.send('conn/listSchemas', { filter });
  }

  async getTableReferences(table: string, schema?: string): Promise<string[]> {
    return await Vue.prototype.$util.send('conn/getTableReferences', { table, schema });
  }

  async getTableKeys(table: string, schema?: string): Promise<TableKey[]> {
    return await Vue.prototype.$util.send('conn/getTableKeys', { table, schema });
  }

  async listTablePartitions(table: string, schema?: string): Promise<TablePartition[]> {
    return await Vue.prototype.$util.send('conn/listTablePartitions', { table, schema });
  }

  async executeCommand(commandText: string): Promise<NgQueryResult[]> {
    return await Vue.prototype.$util.send('conn/executeCommand', { commandText });
  }

  async query(queryText: string, tabId: number, options?: any, hasActiveTransaction: boolean = false): Promise<CancelableQuery> {
    const id = await Vue.prototype.$util.send('conn/query', { queryText, options, tabId, hasActiveTransaction });
    return {
      execute: async () => {
        return await Vue.prototype.$util.send('query/execute', { queryId: id, isManualCommit: options?.isManualCommit })
      },
      cancel: async () => {
        return await Vue.prototype.$util.send('query/cancel', { queryId: id })
      }
    }
  }

  async getCompletions(cmd: string): Promise<string[]> {
    return await Vue.prototype.$util.send('conn/getCompletions', { cmd });
  }

  async getShellPrompt(): Promise<string> {
    return await Vue.prototype.$util.send('conn/getShellPrompt');
  }

  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    return await Vue.prototype.$util.send('conn/executeQuery', { queryText, options });
  }

  async listDatabases(filter?: DatabaseFilterOptions): Promise<string[]> {
    return await Vue.prototype.$util.send('conn/listDatabases', { filter });
  }

  async getTableProperties(table: string, schema?: string): Promise<TableProperties> {
    return await Vue.prototype.$util.send('conn/getTableProperties', { table, schema });
  }

  async getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string> {
    return await Vue.prototype.$util.send('conn/getQuerySelectTop', { table, limit, schema });
  }

  async listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]> {
    return await Vue.prototype.$util.send('conn/listMaterializedViews', { filter });
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string> {
    return await Vue.prototype.$util.send('conn/getPrimaryKey', { table, schema });
  }

  async getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]> {
    return await Vue.prototype.$util.send('conn/getPrimaryKeys', { table, schema });
  }

  async createDatabase(databaseName: string, charset: string, collation: string): Promise<string> {
    return await Vue.prototype.$util.send('conn/createDatabase', { databaseName, charset, collation });
  }

  async createDatabaseSQL(): Promise<string> {
    return await Vue.prototype.$util.send('conn/createDatabaseSQL', {});
  }

  async getTableCreateScript(table: string, schema?: string): Promise<string> {
    return await Vue.prototype.$util.send('conn/getTableCreateScript', { table, schema });
  }

  async getViewCreateScript(view: string, schema?: string): Promise<string[]> {
    return await Vue.prototype.$util.send('conn/getViewCreateScript', { view, schema });
  }

  async getMaterializedViewCreateScript(view: string, schema?: string): Promise<string[]> {
    return await Vue.prototype.$util.send('conn/getMaterializedViewCreateScript', { view, schema });
  }

  async getRoutineCreateScript(routine: string, type: string, schema?: string): Promise<string[]> {
    return await Vue.prototype.$util.send('conn/getRoutineCreateScript', { routine, type, schema });
  }

  async createTable(table: CreateTableSpec): Promise<void> {
    return await Vue.prototype.$util.send('conn/createTable', { table });
  }

  async getCollectionValidation(collection: string): Promise<any> {
    return await Vue.prototype.$util.send('conn/getCollectionValidation', { collection });
  }

  async setCollectionValidation(params: any): Promise<void> {
    return await Vue.prototype.$util.send('conn/setCollectionValidation', { params });
  }

  async alterTableSql(change: AlterTableSpec): Promise<string> {
    return await Vue.prototype.$util.send('conn/alterTableSql', { change });
  }

  async alterTable(change: AlterTableSpec): Promise<void> {
    return await Vue.prototype.$util.send('conn/alterTable', { change });
  }

  async alterIndexSql(changes: IndexAlterations): Promise<string> {
    return await Vue.prototype.$util.send('conn/alterIndexSql', { changes });
  }

  async alterIndex(changes: IndexAlterations): Promise<void> {
    return await Vue.prototype.$util.send('conn/alterIndex', { changes });
  }

  async alterRelationSql(changes: RelationAlterations): Promise<string> {
    return await Vue.prototype.$util.send('conn/alterRelationSql', { changes });
  }

  async alterRelation(changes: RelationAlterations): Promise<void> {
    return await Vue.prototype.$util.send('conn/alterRelation', { changes });
  }

  async alterPartitionSql(changes: AlterPartitionsSpec): Promise<string> {
    return await Vue.prototype.$util.send('conn/alterPartitionSql', { changes });
  }

  async alterPartition(changes: AlterPartitionsSpec): Promise<void> {
    return await Vue.prototype.$util.send('conn/alterPartition', { changes });
  }

  async applyChangesSql(changes: TableChanges): Promise<string> {
    return await Vue.prototype.$util.send('conn/applyChangesSql', { changes });
  }

  async applyChanges(changes: TableChanges): Promise<any[]> {
    return await Vue.prototype.$util.send('conn/applyChanges', { changes });
  }

  async setTableDescription(table: string, description: string, schema?: string): Promise<string> {
    return await Vue.prototype.$util.send('conn/setTableDescription', { table, description, schema });
  }

  async setElementName(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    return await Vue.prototype.$util.send('conn/setElementName', { elementName, newElementName, typeOfElement, schema });
  }

  async dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    return await Vue.prototype.$util.send('conn/dropElement', { elementName, typeOfElement, schema });
  }

  async truncateElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    return await Vue.prototype.$util.send('conn/truncateElement', { elementName, typeOfElement, schema });
  }

  async truncateAllTables(schema?: string): Promise<void> {
    return await Vue.prototype.$util.send('conn/truncateAllTables', { schema });
  }

  async getTableLength(table: string, schema?: string, database?: string): Promise<number> {
    return await Vue.prototype.$util.send('conn/getTableLength', { table, schema, database });
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[], database?: string): Promise<TableResult> {
    return await Vue.prototype.$util.send('conn/selectTop', { table, offset, limit, orderBy, filters, schema, selects, database });
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string> {
    return await Vue.prototype.$util.send('conn/selectTopSql', { table, offset, limit, orderBy, filters, schema, selects });
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> {
    return await Vue.prototype.$util.send('conn/selectTopStream', { table, orderBy, filters, chunkSize, schema });
  }

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    return await Vue.prototype.$util.send('conn/queryStream', { query, chunkSize });
  }

  async duplicateTable(tableName: string, duplicateTableName: string, schema?: string): Promise<void> {
    return await Vue.prototype.$util.send('conn/duplicateTable', { tableName, duplicateTableName, schema });
  }

  async duplicateTableSql(tableName: string, duplicateTableName: string, schema?: string): Promise<string> {
    return await Vue.prototype.$util.send('conn/duplicateTableSql', { tableName, duplicateTableName, schema });
  }

  async getInsertQuery(tableInsert: TableInsert): Promise<string> {
    return await Vue.prototype.$util.send('conn/getInsertQuery', { tableInsert });
  }

  async syncDatabase(): Promise<void> {
    return await Vue.prototype.$util.send('conn/syncDatabase');
  }

  async azureCancelAuth(): Promise<void> {
    return await Vue.prototype.$util.send('conn/azureCancelAuth');
  }

  async azureGetAccountName(authId: string): Promise<string | null> {
    return await Vue.prototype.$util.send('conn/azureGetAccountName', { authId });
  }

  async azureSignOut(config: IConnection): Promise<void> {
    return await Vue.prototype.$util.send('conn/azureSignOut', { config });
  }

  async importStepZero(_table: TableOrView): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  async importBeginCommand(_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  async importTruncateCommand(_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  async importLineReadCommand(_table: TableOrView, _sqlString: string | string[], _importOptions?: ImportFuncOptions): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  async importCommitCommand(_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  async importRollbackCommand(_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  async importFinalCommand(_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  /** Returns a query for the given filter */
  async getQueryForFilter(filter: TableFilter): Promise<string> {
    return await Vue.prototype.$util.send('conn/getQueryForFilter', { filter });
  }

  async getFilteredDataCount(table: string, schema: string | null, filter: string): Promise<string> {
    return await Vue.prototype.$util.send('conn/getFilteredDataCount', { table, schema, filter });
  }

  async reserveConnection(tabId: number) {
    return await Vue.prototype.$util.send('conn/reserveConnection', { tabId });
  }

  async releaseConnection(tabId: number) {
    return await Vue.prototype.$util.send('conn/releaseConnection', { tabId });
  }

  async startTransaction(tabId: number) {
    return await Vue.prototype.$util.send('conn/startTransaction', { tabId });
  }

  async commitTransaction(tabId: number) {
    return await Vue.prototype.$util.send('conn/commitTransaction', { tabId });
  }

  async rollbackTransaction(tabId: number) {
    return await Vue.prototype.$util.send('conn/rollbackTransaction', { tabId });
  }
}
