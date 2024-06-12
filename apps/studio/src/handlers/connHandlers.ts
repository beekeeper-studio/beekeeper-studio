import { UserSetting } from "@/common/appdb/models/user_setting";
import { IConnection } from "@/common/interfaces/IConnection";
import { DatabaseFilterOptions, ExtendedTableColumn, FilterOptions, NgQueryResult, OrderBy, PrimaryKeyColumn, Routine, SchemaFilterOptions, StreamResults, SupportedFeatures, TableChanges, TableColumn, TableFilter, TableIndex, TableInsert, TableOrView, TablePartition, TableProperties, TableResult, TableTrigger, TableUpdateResult } from "@/lib/db/models";
import { DatabaseElement } from "@/lib/db/types";
import { AlterPartitionsSpec, AlterTableSpec, dialectFor, IndexAlterations, RelationAlterations, TableKey } from "@shared/lib/dialects/models";
import { checkConnection, errorMessages, getDriverHandler, state } from "./handlerState";
import ConnectionProvider from '../lib/connection-provider'; 
import { uuidv4 } from "@/lib/uuid";
import { SqlGenerator } from "@shared/lib/sql/SqlGenerator";

export interface IConnectionHandlers {
  // Connection management from the store **************************************
  'conn/create': ({config, osUser}: {config: IConnection, osUser: string}) => Promise<void>,
  'conn/test': ({ config, osUser }: {config: IConnection, osUser: string}) => Promise<void>,
  'conn/changeDatabase': ({newDatabase}: {newDatabase: string}) => Promise<void>,
  'conn/clearConnection': () => Promise<void>,

  // DB Metadata ****************************************************************
  'conn/supportedFeatures': () => Promise<SupportedFeatures>,
  'conn/versionString': () => Promise<string>,
  'conn/defaultSchema': () => Promise<string | null>,
  'conn/listCharsets': () => Promise<string[]>,
  'conn/getDefaultCharset': () => Promise<string>,
  'conn/listCollations': ({charset}: {charset: string}) => Promise<string[]>,

  
  // Connection *****************************************************************
  'conn/connect': () => Promise<void>,
  'conn/disconnect': () => Promise<void>,

  
  // List schema information ****************************************************
  'conn/listTables': ({filter}: {filter?: FilterOptions}) => Promise<TableOrView[]>,
  'conn/listViews': ({filter}: {filter?: FilterOptions}) => Promise<TableOrView[]>,
  'conn/listRoutines': ({filter}: {filter?: FilterOptions}) => Promise<Routine[]>,
  'conn/listMaterializedViewColumns': ({table, schema}: {table: string, schema?: string}) => Promise<TableColumn[]>,
  'conn/listTableColumns': ({table, schema}: {table: string, schema?: string}) => Promise<ExtendedTableColumn[]>,
  'conn/listTableTriggers': ({table, schema}: {table: string, schema?: string}) => Promise<TableTrigger[]>,
  'conn/listTableIndexes': ({table, schema}: {table: string, schema?: string}) => Promise<TableIndex[]>,
  'conn/listSchemas': ({filter}: {filter?: SchemaFilterOptions}) => Promise<string[]>,
  'conn/getTableReferences': ({table, schema}: {table: string, schema?: string}) => Promise<string[]>,
  'conn/getTableKeys': ({table, schema}: {table: string, schema?: string}) => Promise<TableKey[]>,
  'conn/listTablePartitions': ({table, schema}: {table: string, schema?: string}) => Promise<TablePartition[]>,
  'conn/query': ({queryText, options}: {queryText: string, options?: any}) => Promise<string>,
  'conn/executeQuery': ({queryText, options}: {queryText: string, options: any}) => Promise<NgQueryResult[]>,
  'conn/listDatabases': ({filter}: {filter?: DatabaseFilterOptions}) => Promise<string[]>,
  'conn/getTableProperties': ({table, schema}: {table: string, schema?: string}) => Promise<TableProperties | null>,
  'conn/getQuerySelectTop': ({table, limit, schema}: {table: string, limit: number, schema?: string}) => Promise<string>,
  'conn/listMaterializedViews': ({filter}: {filter?: FilterOptions}) => Promise<TableOrView[]>,
  'conn/getPrimaryKey': ({table, schema}: {table: string, schema?: string}) => Promise<string | null>,
  'conn/getPrimaryKeys': ({table, schema}: {table: string, schema?: string}) => Promise<PrimaryKeyColumn[]>,


  // Create Structure ***********************************************************
  'conn/createDatabase': ({databaseName, charset, collation}: {databaseName: string, charset: string, collation: string}) => Promise<void>,
  'conn/createDatabaseSQL': () => Promise<string>,
  'conn/getTableCreateScript': ({table, schema}: {table: string, schema?: string}) => Promise<string>,
  'conn/getViewCreateScript': ({view, schema}: {view: string, schema?: string}) => Promise<string[]>,
  'conn/getMaterializedViewCreateScript': ({view, schema}: {view: string, schema?: string}) => Promise<string[]>,
  'conn/getRoutineCreateScript': ({routine, type, schema}: {routine: string, type: string, schema?: string}) => Promise<string[]>,


  // Make Changes ***************************************************************
  'conn/alterTableSql': ({change}: {change: AlterTableSpec}) => Promise<string>,
  'conn/alterTable': ({change}: {change: AlterTableSpec}) => Promise<void>,
  'conn/alterIndexSql': ({changes}: {changes: IndexAlterations}) => Promise<string | null>,
  'conn/alterIndex': ({changes}: {changes: IndexAlterations}) => Promise<void>,
  'conn/alterRelationSql': ({changes}: {changes: RelationAlterations}) => Promise<string | null>,
  'conn/alterRelation': ({changes}: {changes: RelationAlterations}) => Promise<void>,
  'conn/alterPartitionSql': ({changes}: {changes: AlterPartitionsSpec}) => Promise<string | null>,
  'conn/alterPartition': ({changes}: {changes: AlterPartitionsSpec}) => Promise<void>,
  'conn/applyChangesSql': ({changes}: {changes: TableChanges}) => Promise<string>,
  'conn/applyChanges': ({changes}: {changes: TableChanges}) => Promise<TableUpdateResult[]>,
  'conn/setTableDescription': ({table, description, schema}: {table: string, description: string, schema?: string}) => Promise<string>,
  'conn/dropElement': ({elementName, typeOfElement, schema}: {elementName: string, typeOfElement: DatabaseElement, schema?: string}) => Promise<void>,
  'conn/truncateElement': ({elementName, typeOfElement, schema}: {elementName: string, typeOfElement: DatabaseElement, schema?: string}) => Promise<void>,
  'conn/truncateAllTables': ({schema}: {schema?: string}) => Promise<void>,


  // For TableTable *************************************************************
  'conn/getTableLength': ({table, schema}: {table: string, schema?: string}) => Promise<number>,
  'conn/selectTop': ({table, offset, limit, orderBy, filters, schema, selects}: {table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]}) => Promise<TableResult>,
  'conn/selectTopSql': ({table, offset, limit, orderBy, filters, schema, selects}: {table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]}) => Promise<string>,
  'conn/selectTopStream': ({table, orderBy, filters, chunkSize, schema}: {table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string}) => Promise<StreamResults>,


  // For Export *****************************************************************
  'conn/queryStream': ({query, chunkSize}: {query: string, chunkSize: number}) => Promise<StreamResults>,


  // Duplicate Table ************************************************************
  'conn/duplicateTable': ({tableName, duplicateTableName, schema}: {tableName: string, duplicateTableName: string, schema?: string}) => Promise<void>,
  'conn/duplicateTableSql': ({tableName, duplicateTableName, schema}: {tableName: string, duplicateTableName: string, schema?: string}) => Promise<string>,


  'conn/getInsertQuery': ({tableInsert}: {tableInsert: TableInsert}) => Promise<string>,
}

export const ConnHandlers: IConnectionHandlers = {
  // wtf typescript, this is so fucking ugly
  'conn/create': async function({ config, osUser }: { config: IConnection, osUser: string}) {
    if (!osUser) {
      throw new Error(errorMessages.noUsername);
    }

    const settings = await UserSetting.all();
    const server = ConnectionProvider.for(config, osUser, settings);
    const connection = server.createConnection(config.defaultDatabase || undefined);
    await connection.connect();
    // HACK (@day): this is because of type fuckery, need to actually just recreate the object but I'm lazy rn and it's late
    connection.connectionType = config.connectionType ?? (config as any)._connectionType;

    state.server = server;
    state.usedConfig = config;
    state.connection = connection;
    state.database = config.defaultDatabase;
    state.generator = new SqlGenerator(dialectFor(config.connectionType), {
      dbConfig: connection.server.config,
      dbName: connection.database.database
    });
  },

  'conn/test': async function({ config, osUser }: { config: IConnection, osUser: string }) {
    // TODO (matthew): fix this mess.
    if (!osUser) {
      throw new Error(errorMessages.noUsername);
    }

    const settings = await UserSetting.all();
    const server = ConnectionProvider.for(config, osUser, settings);
    await server?.createConnection(config.defaultDatabase || undefined).connect();
    server.disconnect();
  },

  'conn/changeDatabase': async function({ newDatabase }: { newDatabase: string }) {
    if (!state.server) {
      throw new Error(errorMessages.noServer);
    }

    let connection = state.server.db(newDatabase);
    if (!connection) {
      connection = state.server.createConnection(newDatabase);
      await connection.connect();
    }

    state.connection = connection;
    state.database = newDatabase;
  },

  'conn/clearConnection': async function() {
    state.connection = null;
    state.server = null;
    state.usedConfig = null;
    state.database = null;
    state.generator = null;
  },

  // can only be used when the function doesn't have any arguments :sad:
  'conn/supportedFeatures': getDriverHandler('supportedFeatures'),
  'conn/versionString': getDriverHandler('versionString'),
  'conn/defaultSchema': getDriverHandler('defaultSchema'),
  'conn/listCharsets': getDriverHandler('listCharsets'),
  'conn/getDefaultCharset': getDriverHandler('getDefaultCharset'),

  'conn/listCollations': async function({ charset }: { charset: string }) {
    checkConnection();
    return await state.connection.listCollations(charset);
  },

  'conn/connect': getDriverHandler('connect'),
  'conn/disconnect': getDriverHandler('disconnect'),

  'conn/listTables': async function({ filter }: { filter?: FilterOptions }) {
    checkConnection();
    return await state.connection.listTables(filter);
  },

  'conn/listViews': async function({ filter }: { filter?: FilterOptions }) {
    checkConnection();
    return await state.connection.listViews(filter);
  },

  'conn/listRoutines': async function({ filter }: { filter?: FilterOptions }) {
    checkConnection();
    return await state.connection.listRoutines(filter);
  },

  'conn/listMaterializedViewColumns': async function({ table, schema }: { table: string, schema?: string }) {
    checkConnection();
    return await state.connection.listMaterializedViewColumns(table, schema);
  },

  'conn/listTableColumns': async function({ table, schema}: { table: string, schema?: string }) {
    checkConnection();
    return await state.connection.listTableColumns(table, schema);
  },

  'conn/listTableTriggers': async function({ table, schema }: { table: string, schema?: string }) {
    checkConnection();
    return await state.connection.listTableTriggers(table, schema);
  },

  'conn/listTableIndexes': async function({ table, schema }: { table: string, schema?: string}) {
    checkConnection();  
    return await state.connection.listTableIndexes(table, schema);
  },

  'conn/listSchemas': async function({ filter }: { filter?: SchemaFilterOptions }) {
    checkConnection();
    return await state.connection.listSchemas(filter);
  },

  'conn/getTableReferences': async function({ table, schema }: { table: string, schema?: string }) {
      checkConnection();
     return await state.connection.getTableReferences(table, schema);
  },

  'conn/getTableKeys': async function({ table, schema }: { table: string, schema?: string}) {
    checkConnection();
    return await state.connection.getTableKeys(table, schema);
  },

  'conn/listTablePartitions': async function({ table, schema }: { table: string, schema?: string }) {
    checkConnection();
    return await state.connection.listTablePartitions(table, schema);
  },

  'conn/query': async function({ queryText, options }: { queryText: string, options?: any }) {
    checkConnection();
    const query = await state.connection.query(queryText, options);
    const id = uuidv4();
    state.queries.set(id, query);
    return id;
  },

  'conn/executeQuery': async function({ queryText, options }: { queryText: string, options?: any}) {
    checkConnection();
    return await state.connection.executeQuery(queryText, options);
  },

  'conn/listDatabases': async function({ filter }: { filter?: DatabaseFilterOptions }) {
    checkConnection();
    return await state.connection.listDatabases(filter);
  },

  'conn/getTableProperties': async function({ table, schema }: { table: string, schema?: string}) {
    checkConnection();
    return await state.connection.getTableProperties(table, schema);
  },

  'conn/getQuerySelectTop': async function({ table, limit, schema }: { table: string, limit: number, schema?: string }) {
    checkConnection();
    return state.connection.getQuerySelectTop(table, limit, schema);
  },

  'conn/listMaterializedViews': async function({ filter }: { filter?: FilterOptions }) {
    checkConnection();
    return await state.connection.listMaterializedViews(filter);
  },

  'conn/getPrimaryKey': async function({ table, schema }: { table: string, schema?: string }) {
    checkConnection();
    return await state.connection.getPrimaryKey(table, schema);
  },

  'conn/getPrimaryKeys': async function({ table, schema }: { table: string, schema?: string}) {
    checkConnection();
    return await state.connection.getPrimaryKeys(table, schema);
  },

  'conn/createDatabase': async function({ databaseName, charset, collation }: { databaseName: string, charset: string, collation: string }) {
    checkConnection();
    return await state.connection.createDatabase(databaseName, charset, collation);
  },

  'conn/createDatabaseSQL': async function() {
    checkConnection();
    return state.connection.createDatabaseSQL();
  },

  'conn/getTableCreateScript': async function({ table, schema }: { table: string, schema?: string }) {
    checkConnection();
    return await state.connection.getTableCreateScript(table, schema);
  },

  'conn/getViewCreateScript': async function({ view, schema}: { view: string, schema?: string }) {
    checkConnection();
    return await state.connection.getViewCreateScript(view, schema);
  },

  'conn/getMaterializedViewCreateScript': async function({ view, schema }: { view: string, schema?: string }) {
    checkConnection();
    return await state.connection.getMaterializedViewCreateScript(view, schema);
  },

  'conn/getRoutineCreateScript': async function({ routine, type, schema }: { routine: string, type: string, schema?: string }) {
    checkConnection();
    return await state.connection.getRoutineCreateScript(routine, type, schema);
  },

  'conn/alterTableSql': async function({ change }: { change: AlterTableSpec }) {
    checkConnection();
    return await state.connection.alterTableSql(change);
  },

  'conn/alterTable': async function({ change }: { change: AlterTableSpec }) {
    checkConnection();
    return await state.connection.alterTable(change);
  },

  'conn/alterIndexSql': async function({ changes }: { changes: IndexAlterations }) {
    checkConnection();
    return state.connection.alterIndexSql(changes);
  },

  'conn/alterIndex': async function({ changes }: { changes: IndexAlterations }) {
    checkConnection();
    return await state.connection.alterIndex(changes);
  },

  'conn/alterRelationSql': async function ({ changes }: { changes: RelationAlterations }) {
    checkConnection();
    return state.connection.alterRelationSql(changes);
  },

  'conn/alterRelation': async function({ changes }: { changes: RelationAlterations }) {
    checkConnection();
    return await state.connection.alterRelation(changes);
  },

  'conn/alterPartitionSql': async function({ changes }: { changes: AlterPartitionsSpec}){
    checkConnection();
    return state.connection.alterPartitionSql(changes);
  },

  'conn/alterPartition': async function({ changes }: { changes: AlterPartitionsSpec }) {
    checkConnection();
    return await state.connection.alterPartition(changes);
  },

  'conn/applyChangesSql': async function({ changes }: { changes: TableChanges }) {
    checkConnection();
    return state.connection.applyChangesSql(changes);
  },

  'conn/applyChanges': async function({ changes }: { changes: TableChanges }) {
    checkConnection();
    return await state.connection.applyChanges(changes);
  },

  'conn/setTableDescription': async function({ table, description, schema }: { table: string, description: string, schema?: string }) {
     checkConnection();
     return await state.connection.setTableDescription(table, description, schema);
  },

  'conn/dropElement': async function({ elementName, typeOfElement, schema }: { elementName: string, typeOfElement: DatabaseElement, schema?: string }) {
    checkConnection();
    return await state.connection.dropElement(elementName, typeOfElement, schema);
  },

  'conn/truncateElement': async function({ elementName, typeOfElement, schema }: {elementName: string, typeOfElement: DatabaseElement, schema?: string }) {
    checkConnection();
    return await state.connection.truncateElement(elementName, typeOfElement, schema);
  },

  'conn/truncateAllTables': async function({ schema }: { schema?: string }) {
    checkConnection();
    return state.connection.truncateAllTables(schema);
  },

  'conn/getTableLength': async function({ table, schema }: { table: string, schema?: string }) {
    checkConnection();
    return await state.connection.getTableLength(table, schema);
  },

  'conn/selectTop': async function({ table, offset, limit, orderBy, filters, schema, selects }: { table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[] }) {
    checkConnection();
    return await state.connection.selectTop(table, offset, limit, orderBy, filters, schema, selects);
  },

  'conn/selectTopSql': async function({ table, offset, limit, orderBy, filters, schema, selects }: { table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[] }) {
    checkConnection();
    return await state.connection.selectTopSql(table, offset, limit, orderBy, filters, schema, selects);
  },

  'conn/selectTopStream': async function({ table, orderBy, filters, chunkSize, schema }: { table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string }) {
    checkConnection();
    return await state.connection.selectTopStream(table, orderBy, filters, chunkSize, schema);
  },

  'conn/queryStream': async function({ query, chunkSize }: { query: string, chunkSize: number }) {
    checkConnection();
    return await state.connection.queryStream(query, chunkSize);
  },

  'conn/duplicateTable': async function({ tableName, duplicateTableName, schema }: { tableName: string, duplicateTableName: string, schema?: string }) {
    checkConnection();
    return await state.connection.duplicateTable(tableName, duplicateTableName, schema);
  },

  'conn/duplicateTableSql': async function({ tableName, duplicateTableName, schema }: { tableName: string, duplicateTableName: string, schema?: string }) {
    checkConnection();
    return state.connection.duplicateTableSql(tableName, duplicateTableName, schema);
  },

  'conn/getInsertQuery': async function({ tableInsert }: { tableInsert: TableInsert }) {
    checkConnection();
    return await state.connection.getInsertQuery(tableInsert)
  }
}
