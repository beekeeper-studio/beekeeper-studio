import { MessagePortMain } from 'electron';
import rawLog from 'electron-log'
import { UserSetting } from './common/appdb/models/user_setting';
import { IConnection } from './common/interfaces/IConnection';
import ORMConnection from './common/appdb/Connection'
import ConnectionProvider from './lib/connection-provider'; import platformInfo from './common/platform_info';
import { Handlers } from './handlers/handlers';
import { IDbConnectionPublicServer } from './lib/db/server';
import { BasicDatabaseClient } from './lib/db/clients/BasicDatabaseClient';
import { CancelableQuery, DatabaseFilterOptions, FilterOptions, OrderBy, SchemaFilterOptions, TableChanges, TableFilter, TableInsert } from './lib/db/models';
import { AlterPartitionsSpec, AlterTableSpec, IndexAlterations, RelationAlterations } from '@shared/lib/dialects/models';
import { DatabaseElement } from './lib/db/types';
import { uuidv4 } from './lib/uuid';

const log = rawLog.scope('UtilityProcess');

let port: MessagePortMain;
let ormConnection: ORMConnection;

interface Reply {
  id: string,
  type: 'reply' | 'error',
  data?: any,
  error?: string
}

class State {
  server: IDbConnectionPublicServer = null;
  usedConfig: IConnection = null;
  connection: BasicDatabaseClient<any> = null;
  database: string = null;
  username: string = null;
  queries: Map<string, CancelableQuery> = new Map();
}

const state = new State();

// TODO (@day): we need some sort of global state for this process, can it just be a global object?

// this is just how the actual app guy does it, we could maybe fuck around with just having a class?
export let handlers = {} as unknown as Handlers; 

const errorMessages = {
  noUsername: 'No username provided',
  noDatabase: 'No database connection found',
  noServer: 'No server found',
  noQuery: 'Query not found'
}

// wtf typescript, this is so fucking ugly
handlers['conn/create'] = async function({ config, osUser }: { config: IConnection, osUser: string}) {
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

  const result = await connection.listTables();
  log.info('LIST TABLES: ', result);
}

handlers['conn/test'] = async function({ config, osUser }: { config: IConnection, osUser: string }) {
  // TODO (matthew): fix this mess.
  if (!osUser) {
    throw new Error(errorMessages.noUsername);
  }

  const settings = await UserSetting.all();
  const server = ConnectionProvider.for(config, osUser, settings);
  await server?.createConnection(config.defaultDatabase || undefined).connect();
  server.disconnect();
}

handlers['conn/changeDatabase'] = async function({ newDatabase }: { newDatabase: string }) {
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
}

handlers['conn/clearConnection'] = async function() {
  state.connection = null;
  state.server = null;
  state.usedConfig = null;
  state.database = null;
}

// can only be used when the function doesn't have any arguments :sad:
function getDriverHandler(name: string) {
  return async function(): Promise<any> {
    return await state.connection[name]();
  }
}

function checkConnection() {
  if (!state.connection) {
    throw new Error(errorMessages.noDatabase);
  }
}

handlers['conn/supportedFeatures'] = getDriverHandler('supportedFeatures');
handlers['conn/versionString'] = getDriverHandler('versionString');
handlers['conn/defaultSchema'] = getDriverHandler('defaultSchema');
handlers['conn/listCharsets'] = getDriverHandler('listCharsets');
handlers['conn/getDefaultCharset'] = getDriverHandler('getDefaultCharset');
handlers['conn/listCollations'] = getDriverHandler('listCollations');

handlers['conn/connect'] = getDriverHandler('connect');
handlers['conn/disconnect'] = getDriverHandler('disconnect');

handlers['conn/listTables'] = async function({ filter }: { filter?: FilterOptions }) {
  checkConnection();
  return await state.connection.listTables(filter);
}

handlers['conn/listViews'] = async function({ filter }: { filter?: FilterOptions }) {
  checkConnection();
  return await state.connection.listViews(filter);
}

handlers['conn/listRoutines'] = async function({ filter }: { filter?: FilterOptions }) {
  checkConnection();
  return await state.connection.listRoutines(filter);
}

handlers['conn/listMaterializedViewColumns'] = async function({ table, schema }: { table: string, schema?: string }) {
  checkConnection();
  return await state.connection.listMaterializedViewColumns(table, schema);
}

handlers['conn/listTableColumns'] = async function({ table, schema}: { table: string, schema?: string }) {
  checkConnection();
  return await state.connection.listTableColumns(table, schema);
}

handlers['conn/listTableTriggers'] = async function({ table, schema }: { table: string, schema?: string }) {
  checkConnection();
  return await state.connection.listTableTriggers(table, schema);
}

handlers['conn/listTableIndexes'] = async function({ table, schema }: { table: string, schema?: string}) {
  checkConnection();  
  return await state.connection.listTableIndexes(table, schema);
}

handlers['conn/listSchemas'] = async function({ filter }: { filter?: SchemaFilterOptions }) {
  checkConnection();
  return await state.connection.listSchemas(filter);
}

handlers['conn/getTableReferences'] = async function({ table, schema }: { table: string, schema?: string }) {
    checkConnection();
   return await state.connection.getTableReferences(table, schema);
}

handlers['conn/getTableKeys'] = async function({ table, schema }: { table: string, schema?: string}) {
  checkConnection();
  return await state.connection.getTableKeys(table, schema);
}

handlers['conn/listTablePartitions'] = async function({ table, schema }: { table: string, schema?: string }) {
  checkConnection();
  return await state.connection.listTablePartitions(table, schema);
}

// TODO (@day): this probably doesn't work lol, may need to have queries store in a map/array with ids for each query
// that we return to the renderer, then they can call query/execute and query/cancel with the id
handlers['conn/query'] = async function({ queryText, options }: { queryText: string, options?: any }) {
  checkConnection();
  const query = state.connection.query(queryText, options);
  const id = uuidv4();
  state.queries.set(id, query);
  return id;
}

handlers['conn/executeQuery'] = async function({ queryText, options }: { queryText: string, options?: any}) {
  checkConnection();
  return await state.connection.executeQuery(queryText, options);
}

handlers['conn/listDatabases'] = async function({ filter }: { filter?: DatabaseFilterOptions }) {
  checkConnection();
  return await state.connection.listDatabases(filter);
}

handlers['conn/getTableProperties'] = async function({ table, schema }: { table: string, schema?: string}) {
  checkConnection();
  return await state.connection.getTableProperties(table, schema);
}

handlers['conn/getQuerySelectTop'] = async function({ table, limit, schema }: { table: string, limit: number, schema?: string }) {
  checkConnection();
  return state.connection.getQuerySelectTop(table, limit, schema);
}

handlers['conn/listMaterializedViews'] = async function({ filter }: { filter?: FilterOptions }) {
  checkConnection();
  return await state.connection.listMaterializedViews(filter);
}

handlers['conn/getPrimaryKey'] = async function({ table, schema }: { table: string, schema?: string }) {
  checkConnection();
  return await state.connection.getPrimaryKey(table, schema);
}

handlers['conn/getPrimaryKeys'] = async function({ table, schema }: { table: string, schema?: string}) {
  checkConnection();
  return await state.connection.getPrimaryKeys(table, schema);
}

handlers['conn/createDatabase'] = async function({ databaseName, charset, collation }: { databaseName: string, charset: string, collation: string }) {
  checkConnection();
  return await state.connection.createDatabase(databaseName, charset, collation);
}

handlers['conn/createDatabaseSQL'] = async function() {
  checkConnection();
  return state.connection.createDatabaseSQL();
}

handlers['conn/getTableCreateScript'] = async function({ table, schema }: { table: string, schema?: string }) {
  checkConnection();
  return await state.connection.getTableCreateScript(table, schema);
}

handlers['conn/getViewCreateScript'] = async function({ view, schema}: { view: string, schema?: string }) {
  checkConnection();
  return await state.connection.getViewCreateScript(view, schema);
}

handlers['conn/getMaterializedViewCreateScript'] = async function({ view, schema }: { view: string, schema?: string }) {
  checkConnection();
  return await state.connection.getMaterializedViewCreateScript(view, schema);
}

handlers['conn/getRoutineCreateScript'] = async function({ routine, type, schema }: { routine: string, type: string, schema?: string }) {
  checkConnection();
  return await state.connection.getRoutineCreateScript(routine, type, schema);
}

handlers['conn/alterTableSql'] = async function({ change }: { change: AlterTableSpec }) {
  checkConnection();
  return await state.connection.alterTableSql(change);
}

handlers['conn/alterTable'] = async function({ change }: { change: AlterTableSpec }) {
  checkConnection();
  return await state.connection.alterTable(change);
}

handlers['conn/alterIndexSql'] = async function({ changes }: { changes: IndexAlterations }) {
  checkConnection();
  return state.connection.alterIndexSql(changes);
}

handlers['conn/alterIndex'] = async function({ changes }: { changes: IndexAlterations }) {
  checkConnection();
  return await state.connection.alterIndex(changes);
}

handlers['conn/alterRelationSql'] = async function ({ changes }: { changes: RelationAlterations }) {
  checkConnection();
  return state.connection.alterRelationSql(changes);
}

handlers['conn/alterRelation'] = async function({ changes }: { changes: RelationAlterations }) {
  checkConnection();
  return await state.connection.alterRelation(changes);
}

handlers['conn/alterPartitionSql'] = async function({ changes }: { changes: AlterPartitionsSpec}){
  checkConnection();
  return state.connection.alterPartitionSql(changes);
}

handlers['conn/alterPartition'] = async function({ changes }: { changes: AlterPartitionsSpec }) {
  checkConnection();
  return await state.connection.alterPartition(changes);
}

handlers['conn/applyChangesSql'] = async function({ changes }: { changes: TableChanges }) {
  checkConnection();
  return state.connection.applyChangesSql(changes);
}

handlers['conn/applyChanges'] = async function({ changes }: { changes: TableChanges }) {
  checkConnection();
  return await state.connection.applyChanges(changes);
}

handlers['conn/setTableDescription'] = async function({ table, description, schema }: { table: string, description: string, schema?: string }) {
   checkConnection();
   return await state.connection.setTableDescription(table, description, schema);
}

handlers['conn/dropElement'] = async function({ elementName, typeOfElement, schema }: { elementName: string, typeOfElement: DatabaseElement, schema?: string }) {
  checkConnection();
  return await state.connection.dropElement(elementName, typeOfElement, schema);
}

handlers['conn/truncateElement'] = async function({ elementName, typeOfElement, schema }: {elementName: string, typeOfElement: DatabaseElement, schema?: string }) {
  checkConnection();
  return await state.connection.truncateElement(elementName, typeOfElement, schema);
}

handlers['conn/truncateAllTables'] = async function({ schema }: { schema?: string }) {
  checkConnection();
  return state.connection.truncateAllTables(schema);
}

handlers['conn/getTableLength'] = async function({ table, schema }: { table: string, schema?: string }) {
  checkConnection();
  return await state.connection.getTableLength(table, schema);
}

handlers['conn/selectTop'] = async function({ table, offset, limit, orderBy, filters, schema, selects }: { table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[] }) {
  checkConnection();
  return await state.connection.selectTop(table, offset, limit, orderBy, filters, schema, selects);
}

handlers['conn/selectTopSql'] = async function({ table, offset, limit, orderBy, filters, schema, selects }: { table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[] }) {
  checkConnection();
  return await state.connection.selectTopSql(table, offset, limit, orderBy, filters, schema, selects);
}

handlers['conn/selectTopStream'] = async function({ table, orderBy, filters, chunkSize, schema }: { table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string }) {
  checkConnection();
  return await state.connection.selectTopStream(table, orderBy, filters, chunkSize, schema);
}

handlers['conn/queryStream'] = async function({ query, chunkSize }: { query: string, chunkSize: number }) {
  checkConnection();
  return await state.connection.queryStream(query, chunkSize);
}

handlers['conn/duplicateTable'] = async function({ tableName, duplicateTableName, schema }: { tableName: string, duplicateTableName: string, schema?: string }) {
  checkConnection();
  return await state.connection.duplicateTable(tableName, duplicateTableName, schema);
}

handlers['conn/duplicateTableSql'] = async function({ tableName, duplicateTableName, schema }: { tableName: string, duplicateTableName: string, schema?: string }) {
  checkConnection();
  return state.connection.duplicateTableSql(tableName, duplicateTableName, schema);
}

handlers['conn/getInsertQuery'] = async function({ tableInsert }: { tableInsert: TableInsert }) {
  checkConnection();
  return await state.connection.getInsertQuery(tableInsert)
}



handlers['query/execute'] = async function({ queryId }: { queryId: string }) { 
  checkConnection();
  const query = state.queries.get(queryId);
  if (!query) {
    throw new Error(errorMessages.noQuery);
  }

  const result = await query.execute();
  // not totally sure on this
  state.queries.delete(queryId);
  return result;
}

handlers['query/cancel'] = async function({ queryId }: { queryId: string }) {
  checkConnection();
  const query = state.queries.get(queryId);
  if (!query) {
    throw new Error(errorMessages.noQuery);
  }

  await query.cancel();
  state.queries.delete(queryId);
}


// May have to treat this like initialization, or add an initialisation hook
process.parentPort.on('message', ({ ports }) => {
  if (ports && ports.length > 0) {
    port = ports[0]
    log.info('RECEIVED PORT: ', port);
    init();
    addHandlers();
    port.start();
  }
})

async function runHandler(id: string, name: string, args: any) {
  log.info('RECEIVED REQUEST FOR NAME, ID: ', name, id);
  let replyArgs: Reply = {
    id,
    type: 'reply',
  };

  if (handlers[name]) {
    try {
      replyArgs.data = await handlers[name](args)
    } catch (e) {
      replyArgs.type = 'error';
      replyArgs.error = e?.message ?? e
    }
  } else {
    replyArgs.type = 'error';
    replyArgs.error = 'Invalid handler name';
  }

  port.postMessage(replyArgs);
}

function addHandlers() {
  port.on('message',  ({ data }) => {
    const { id, name, args } = data;
    runHandler(id, name, args);
  })
}

function init() {
  ormConnection = new ORMConnection(platformInfo.appDbPath, false);
  ormConnection.connect();
}
