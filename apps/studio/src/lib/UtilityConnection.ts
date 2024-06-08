import { uuidv4 } from "./uuid";
import rawLog from 'electron-log';
import _ from 'lodash';
import { DatabaseElement, IBasicDatabaseClient } from "./db/types";
import { TableKey, AlterTableSpec, IndexAlterations, RelationAlterations, AlterPartitionsSpec } from "@shared/lib/dialects/models";
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, TablePartition, NgQueryResult, DatabaseFilterOptions, TableProperties, PrimaryKeyColumn, TableChanges, OrderBy, TableFilter, TableResult, StreamResults, TableInsert, CancelableQuery } from "./db/models";

const log = rawLog.scope('UtilConnection');

type Listener = (input: any) => void;

export class UtilityConnection implements IBasicDatabaseClient {
  private replyHandlers: Map<string, { resolve: any, reject: any }> = new Map();
  private listeners: Array<{type: string, id: string, listener: Listener}> = new Array();

  constructor(private port: MessagePort) {
    port.onmessage = (msg) => {
      const { data: msgData } = msg;
      log.info('RECEIVED MESSAGE: ', msgData.type, msgData)

      if (msgData.type === 'error') {
        // handle errors
        const { id, error } = msgData;

        const handler = this.replyHandlers.get(id);
        if (handler) {
          log.error('GOT ERROR BACK FOR REQUEST ID: ', id);
          this.replyHandlers.delete(id);
          handler.reject(error);
        }
      } else if (msgData.type === 'reply') {
        const { id, data } = msgData;

        const handler = this.replyHandlers.get(id);
        if (handler) {
          log.info('RECEIVED REPLY FOR REQUEST ID: ', id);
          this.replyHandlers.delete(id);

          handler.resolve(data);
        }
      } else if (_.some(this.listeners, ({type}) => msgData.type === type)) {
        const { listener, type, id } = this.listeners.find(({type}) => msgData.type === type);
        log.info('HANDLING REQUEST WITH LISTENER (type, id): ', type, id);
        const { input } = msgData;
        listener(input);
      }
    }
  }

  public async send(handlerName: string, args: any): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const id = uuidv4();
      log.info('SENDING REQUEST FOR NAME, ID: ', handlerName, id)

      this.replyHandlers.set(id, { resolve, reject });

      this.port.postMessage({id, name: handlerName, args: args ?? {}});
    })
  }

  public addListener(type: string, listener: Listener): string {
    const id = uuidv4();
    this.listeners.push({ type, id, listener });
    log.info('ADDED LISTENER: ', type, id);

    return id;
  }

  public removeListener(id: string) {
    this.listeners = _.reject(this.listeners, { 'id': id });
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
    return await this.send('conn/supportedFeatures', {})
  }

  async versionString(): Promise<string> {
    return await this.send('conn/defaultSchema', {});
  }

  async defaultSchema(): Promise<string> {
    return await this.send('conn/defaultSchema', {});
  }

  async listCharsets(): Promise<string[]> {
    return await this.send('conn/listCharsets', {});
  }

  async getDefaultCharset(): Promise<string> {
    return await this.send('conn/getDefaultCharset', {});
  }

  async listCollations(charset: string): Promise<string[]> {
    return await this.send('conn/listCollations', { charset });
  }

  async connect(): Promise<void> {
    return await this.send('conn/connect', {});
  }

  async disconnect(): Promise<void> {
    return await this.send('conn/disconnect', {});
  }

  async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    return await this.send('conn/listTables', { filter });
  }

  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    return await this.send('conn/listViews', { filter });
  }

  async listRoutines(filter?: FilterOptions): Promise<Routine[]> {
    return await this.send('conn/listRoutines', { filter });
  }

  async listMaterializedViewColumns(table: string, schema?: string): Promise<TableColumn[]> {
    return await this.send('conn/listMaterializedViews', { table, schema })
  }

  async listTableColumns(table: string, schema?: string): Promise<ExtendedTableColumn[]> {
    return await this.send('conn/listTableColumns', { table, schema });
  }

  async listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]> {
    return await this.send('conn/listTableTriggers', { table, schema });
  }

  async listTableIndexes(table: string, schema?: string): Promise<TableIndex[]> {
    return await this.send('conn/listTableIndexes', { table, schema });
  }

  async listSchemas(filter?: SchemaFilterOptions): Promise<string[]> {
    return await this.send('conn/listSchemas', { filter });
  }

  async getTableReferences(table: string, schema?: string): Promise<string[]> {
    return await this.send('conn/getTableReferences', { table, schema });
  }

  async getTableKeys(table: string, schema?: string): Promise<TableKey[]> {
    return await this.send('conn/getTableKeys', { table, schema });
  }

  async listTablePartitions(table: string, schema?: string): Promise<TablePartition[]> {
    return await this.send('conn/listTablePartitions', { table, schema });
  }

  async query(queryText: string, options?: any): Promise<CancelableQuery> {
    const id = await this.send('conn/query', { queryText, options });
    return {
      execute: async () => {
        return await this.send('query/execute', { queryId: id })
      },
      cancel: async () => {
        return await this.send('query/cancel', { queryId: id })
      }
    }
  }

  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    return await this.send('conn/executeQuery', { queryText, options });
  }

  async listDatabases(filter?: DatabaseFilterOptions): Promise<string[]> {
    return await this.send('conn/listDatabases', { filter });
  }

  async getTableProperties(table: string, schema?: string): Promise<TableProperties> {
    return await this.send('conn/getTableProperties', { table, schema });
  }

  async getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string> {
    return await this.send('conn/getQuerySelectTop', { table, limit, schema });
  }

  async listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]> {
    return await this.send('conn/listMaterializedViews', { filter });
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string> {
    return await this.send('conn/getPrimaryKey', { table, schema });
  }

  async getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]> {
    return await this.send('conn/getPrimaryKeys', { table, schema });
  }

  async createDatabase(databaseName: string, charset: string, collation: string): Promise<void> {
    return await this.send('conn/createDatabase', { databaseName, charset, collation });
  }

  async createDatabaseSQL(): Promise<string> {
    return await this.send('conn/createDatabaseSQL', {});
  }

  async getTableCreateScript(table: string, schema?: string): Promise<string> {
    return await this.send('conn/getTableCreateScript', { table, schema });
  }

  async getViewCreateScript(view: string, schema?: string): Promise<string[]> {
    return await this.send('conn/getViewCreateScript', { view, schema });
  }

  async getMaterializedViewCreateScript(view: string, schema?: string): Promise<string[]> {
    return await this.send('conn/getMaterializedViewCreateScript', { view, schema });
  }

  async getRoutineCreateScript(routine: string, type: string, schema?: string): Promise<string[]> {
    return await this.send('conn/getRoutineCreateScript', { routine, type, schema });
  }

  async alterTableSql(change: AlterTableSpec): Promise<string> {
    return await this.send('conn/alterTableSql', { change });
  }

  async alterTable(change: AlterTableSpec): Promise<void> {
    return await this.send('conn/alterTable', { change });
  }

  async alterIndexSql(changes: IndexAlterations): Promise<string> {
    return await this.send('conn/alterIndexSql', { changes });
  }

  async alterIndex(changes: IndexAlterations): Promise<void> {
    return await this.send('conn/alterIndex', { changes });
  }

  async alterRelationSql(changes: RelationAlterations): Promise<string> {
    return await this.send('conn/alterRelationSql', { changes });
  }

  async alterRelation(changes: RelationAlterations): Promise<void> {
    return await this.send('conn/alterRelation', { changes });
  }

  async alterPartitionSql(changes: AlterPartitionsSpec): Promise<string> {
    return await this.send('conn/alterPartitionSql', { changes });
  }

  async alterPartition(changes: AlterPartitionsSpec): Promise<void> {
    return await this.send('conn/alterPartition', { changes });
  }

  async applyChangesSql(changes: TableChanges): Promise<string> {
    return await this.send('conn/applyChangesSql', { changes });
  }

  async applyChanges(changes: TableChanges): Promise<any[]> {
    return await this.send('conn/applyChanges', { changes });
  }

  async setTableDescription(table: string, description: string, schema?: string): Promise<string> {
    return await this.send('conn/setTableDescription', { table, description, schema });
  }

  async dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    return await this.send('conn/dropElement', { elementName, typeOfElement, schema });
  }

  async truncateElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    return await this.send('conn/truncateElement', { elementName, typeOfElement, schema });
  }

  async truncateAllTables(schema?: string): Promise<void> {
    return await this.send('conn/truncateAllTables', { schema });
  }

  async getTableLength(table: string, schema?: string): Promise<number> {
    return await this.send('conn/getTableLength', { table, schema });
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult> {
    return await this.send('conn/selectTop', { table, offset, limit, orderBy, filters, schema, selects });
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string> {
    return await this.send('conn/selectTopSql', { table, offset, limit, orderBy, filters, schema, selects });
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> {
    return await this.send('conn/selectTopStream', { table, orderBy, filters, chunkSize, schema });
  }

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    return await this.send('conn/queryStream', { query, chunkSize });
  }

  async duplicateTable(tableName: string, duplicateTableName: string, schema?: string): Promise<void> {
    return await this.send('conn/duplicateTable', { tableName, duplicateTableName, schema });
  }

  async duplicateTableSql(tableName: string, duplicateTableName: string, schema?: string): Promise<string> {
    return await this.send('conn/duplicateTableSql', { tableName, duplicateTableName, schema });
  }

  async getInsertQuery(tableInsert: TableInsert): Promise<string> {
    return await this.send('conn/getInsertQuery', { tableInsert });
  }
  
}
