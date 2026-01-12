import { UserSetting } from "@/common/appdb/models/user_setting";
import { IConnection } from "@/common/interfaces/IConnection";
import { DatabaseFilterOptions, ExtendedTableColumn, FilterOptions, NgQueryResult, OrderBy, PrimaryKeyColumn, Routine, SchemaFilterOptions, StreamResults, SupportedFeatures, TableChanges, TableColumn, TableFilter, TableIndex, TableInsert, TableOrView, TablePartition, TableProperties, TableResult, TableTrigger, TableUpdateResult } from "@/lib/db/models";
import { DatabaseElement, IDbConnectionServerConfig } from "@/lib/db/types";
import { AlterPartitionsSpec, AlterTableSpec, CreateTableSpec, dialectFor, IndexAlterations, RelationAlterations, TableKey } from "@shared/lib/dialects/models";
import { checkConnection, errorMessages, getDriverHandler, state } from "@/handlers/handlerState";
import ConnectionProvider from '../lib/connection-provider';
import { uuidv4 } from "@/lib/uuid";
import { SqlGenerator } from "@shared/lib/sql/SqlGenerator";
import { TokenCache } from "@/common/appdb/models/token_cache";
import { SavedConnection } from "@/common/appdb/models/saved_connection";
import { AzureAuthService } from "@/lib/db/authentication/azure";
import bksConfig from "@/common/bksConfig";
import { UserPin } from "@/common/appdb/models/UserPin";
import { waitPromise } from "@/common/utils";

export interface IConnectionHandlers {
  // Connection management from the store **************************************
  'conn/create': ({ config, auth, osUser, sId }: {config: IConnection, auth?: { input: string; mode: "pin" }, osUser: string, sId: string }) => Promise<void>,
  'conn/test': ({ config, osUser, sId }: { config: IConnection, osUser: string, sId: string }) => Promise<void>,
  'conn/changeDatabase': ({ newDatabase, sId }: { newDatabase: string, sId: string }) => Promise<void>,
  'conn/clearConnection': ({ sId }: { sId: string}) => Promise<void>,
  'conn/getServerConfig': ({ sId }: { sId: string }) => Promise<IDbConnectionServerConfig>,

  // DB Metadata ****************************************************************
  'conn/supportedFeatures': ({ sId }: { sId: string}) => Promise<SupportedFeatures>,
  'conn/versionString': ({ sId }: { sId: string}) => Promise<string>,
  'conn/defaultSchema': ({ sId }: { sId: string}) => Promise<string | null>,
  'conn/listCharsets': ({ sId }: { sId: string}) => Promise<string[]>,
  'conn/getDefaultCharset': ({ sId }: { sId: string}) => Promise<string>,
  'conn/listCollations': ({ charset, sId }: { charset: string, sId: string }) => Promise<string[]>,


  // Connection *****************************************************************
  'conn/connect': ({ sId }: { sId: string}) => Promise<void>,
  'conn/disconnect': ({ sId }: { sId: string}) => Promise<void>,


  // List schema information ****************************************************
  'conn/listTables': ({ filter, sId }: { filter?: FilterOptions, sId: string }) => Promise<TableOrView[]>,
  'conn/listViews': ({ filter, sId }: { filter?: FilterOptions, sId: string }) => Promise<TableOrView[]>,
  'conn/listRoutines': ({ filter, sId }: { filter?: FilterOptions, sId: string }) => Promise<Routine[]>,
  'conn/listMaterializedViewColumns': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<TableColumn[]>,
  'conn/listTableColumns': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<ExtendedTableColumn[]>,
  'conn/listTableTriggers': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<TableTrigger[]>,
  'conn/listTableIndexes': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<TableIndex[]>,
  'conn/listSchemas': ({ filter, sId }: { filter?: SchemaFilterOptions, sId: string }) => Promise<string[]>,
  'conn/getTableReferences': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<string[]>,
  'conn/getTableKeys': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<TableKey[]>,
  'conn/getOutgoingKeys': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<TableKey[]>,
  'conn/getIncomingKeys': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<TableKey[]>,
  'conn/listTablePartitions': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<TablePartition[]>,
  'conn/executeCommand': ({ commandText, sId }: { commandText: string, sId: string }) => Promise<NgQueryResult[]>,
  'conn/query': ({ queryText, options, tabId, hasActiveTransaction, sId }: { queryText: string, options?: any, tabId: number, hasActiveTransaction: boolean, sId: string }) => Promise<string>,
  'conn/getCompletions': ({ cmd, sId }: { cmd: string, sId: string }) => Promise<string[]>,
  'conn/getShellPrompt': ({ sId }: { sId: string }) => Promise<string>,
  'conn/executeQuery': ({ queryText, options, sId }: { queryText: string, options: any, sId: string }) => Promise<NgQueryResult[]>,
  'conn/listDatabases': ({ filter, sId }: { filter?: DatabaseFilterOptions, sId: string }) => Promise<string[]>,
  'conn/getTableProperties': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<TableProperties | null>,
  'conn/getQuerySelectTop': ({ table, limit, schema, sId }: { table: string, limit: number, schema?: string, sId: string }) => Promise<string>,
  'conn/listMaterializedViews': ({ filter, sId }: { filter?: FilterOptions, sId: string }) => Promise<TableOrView[]>,
  'conn/getPrimaryKey': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<string | null>,
  'conn/getPrimaryKeys': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<PrimaryKeyColumn[]>,


  // Create Structure ***********************************************************
  'conn/createDatabase': ({ databaseName, charset, collation, sId }: { databaseName: string, charset: string, collation: string, sId: string }) => Promise<string>,
  'conn/createDatabaseSQL': ({ sId }: { sId: string }) => Promise<string>,
  'conn/getTableCreateScript': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<string>,
  'conn/getViewCreateScript': ({ view, schema, sId }: { view: string, schema?: string, sId: string }) => Promise<string[]>,
  'conn/getMaterializedViewCreateScript': ({ view, schema, sId }: { view: string, schema?: string, sId: string }) => Promise<string[]>,
  'conn/getRoutineCreateScript': ({ routine, type, schema, sId }: { routine: string, type: string, schema?: string, sId: string }) => Promise<string[]>,
  'conn/createTable': ({ table }: { table: CreateTableSpec }) => Promise<void>,
  'conn/getCollectionValidation': ({ collection, sId }: { collection: string, sId: string }) => Promise<any>,
  'conn/setCollectionValidation': ({ params, sId }: { params: any, sId: string }) => Promise<void>,


  // Make Changes ***************************************************************
  'conn/alterTableSql': ({ change, sId }: { change: AlterTableSpec, sId: string }) => Promise<string>,
  'conn/alterTable': ({ change, sId }: { change: AlterTableSpec, sId: string }) => Promise<void>,
  'conn/alterIndexSql': ({ changes, sId }: { changes: IndexAlterations, sId: string }) => Promise<string | null>,
  'conn/alterIndex': ({ changes, sId }: { changes: IndexAlterations, sId: string }) => Promise<void>,
  'conn/alterRelationSql': ({ changes, sId }: { changes: RelationAlterations, sId: string }) => Promise<string | null>,
  'conn/alterRelation': ({ changes, sId }: { changes: RelationAlterations, sId: string }) => Promise<void>,
  'conn/alterPartitionSql': ({ changes, sId }: { changes: AlterPartitionsSpec, sId: string }) => Promise<string | null>,
  'conn/alterPartition': ({ changes, sId }: { changes: AlterPartitionsSpec, sId: string }) => Promise<void>,
  'conn/applyChangesSql': ({ changes, sId }: { changes: TableChanges, sId: string }) => Promise<string>,
  'conn/applyChanges': ({ changes, sId }: { changes: TableChanges, sId: string }) => Promise<TableUpdateResult[]>,
  'conn/setTableDescription': ({ table, description, schema, sId }: { table: string, description: string, schema?: string, sId: string }) => Promise<string>,
  'conn/setElementName': ({ elementName, newElementName, typeOfElement, schema, sId }: { elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string, sId: string }) => Promise<void>,
  'conn/dropElement': ({ elementName, typeOfElement, schema, sId }: { elementName: string, typeOfElement: DatabaseElement, schema?: string, sId: string }) => Promise<void>,
  'conn/truncateElement': ({ elementName, typeOfElement, schema, sId }: { elementName: string, typeOfElement: DatabaseElement, schema?: string, sId: string }) => Promise<void>,
  'conn/truncateAllTables': ({ schema, sId }: { schema?: string, sId: string }) => Promise<void>,


  // For TableTable *************************************************************
  'conn/getTableLength': ({ table, schema, sId }: { table: string, schema?: string, sId: string }) => Promise<number>,
  'conn/selectTop': ({ table, offset, limit, orderBy, filters, schema, selects, sId }: { table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[], sId: string }) => Promise<TableResult>,
  'conn/selectTopSql': ({ table, offset, limit, orderBy, filters, schema, selects, sId }: { table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[], sId: string }) => Promise<string>,
  'conn/selectTopStream': ({ table, orderBy, filters, chunkSize, schema, sId }: { table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string, sId: string }) => Promise<StreamResults>,


  // For Export *****************************************************************
  'conn/queryStream': ({ query, chunkSize, sId }: { query: string, chunkSize: number, sId: string }) => Promise<StreamResults>,


  // Duplicate Table ************************************************************
  'conn/duplicateTable': ({ tableName, duplicateTableName, schema, sId }: { tableName: string, duplicateTableName: string, schema?: string, sId: string }) => Promise<void>,
  'conn/duplicateTableSql': ({ tableName, duplicateTableName, schema, sId }: { tableName: string, duplicateTableName: string, schema?: string, sId: string }) => Promise<string>,


  'conn/getInsertQuery': ({ tableInsert, runAsUpsert, sId }: { tableInsert: TableInsert, runAsUpsert?: boolean, sId: string }) => Promise<string>,

  'conn/syncDatabase': ({ sId }: { sId: string }) => Promise<void>

  'conn/azureCancelAuth': ({ sId }: { sId: string }) => Promise<void>
  'conn/azureSignOut': ({ config, sId }: { config: IConnection, sId: string }) => Promise<void>,
  /** Get account name if it's signed in, otherwise return undefined */
  'conn/azureGetAccountName': ({ authId, sId }: { authId: number, sId: string }) => Promise<string | null>,

  'conn/getQueryForFilter': ({ filter, sId }: { filter: TableFilter, sId: string }) => Promise<string>,
  'conn/getFilteredDataCount': ({ table, schema, filter, sId }: { table: string, schema: string | null, filter: string, sId: string }) => Promise<string>

  'conn/reserveConnection': ({ tabId, sId }: { tabId: number, sId: string }) => Promise<void>,
  'conn/releaseConnection': ({ tabId, sId }: { tabId: number, sId: string }) => Promise<void>,
  'conn/startTransaction': ({ tabId, sId }: { tabId: number, sId: string }) => Promise<void>,
  'conn/commitTransaction': ({ tabId, sId }: { tabId: number, sId: string }) => Promise<void>,
  'conn/rollbackTransaction': ({ tabId, sId}: { tabId: number, sId: string }) => Promise<void>,

  'conn/resetTransactionTimeout': ({ tabId, sId}: {tabId: number, sId: string}) => Promise<void>
}

export const ConnHandlers: IConnectionHandlers = {
  'conn/create': async function({ config, auth, osUser, sId }: { config: IConnection, auth?: { input: string; mode: "pin" }, osUser: string, sId: string}) {
    if (!osUser) {
      throw new Error(errorMessages.noUsername);
    }

    if (bksConfig.security.lockMode === "pin") {
      await waitPromise(1000);

      if (!auth) {
        throw new Error(`Authentication is required.`);
      }
      if (auth.mode !== "pin") {
        throw new Error(`Invalid authentication mode: ${auth.mode}`);
      }
      if(!await UserPin.verifyPin(auth.input)) {
        throw new Error(`Incorrect pin. Please try again.`);
      }
    }

    if (config.azureAuthOptions?.azureAuthEnabled && !config.authId) {
      let cache = new TokenCache();
      cache = await cache.save();
      config.authId = cache.id;
      // need to single out saved connections here (this may change when used connections are fixed)
      if (config.id) {
        // we do this so any temp configs that the user did aren't saved, just the id
        const conn = await SavedConnection.findOneBy({ id: config.id });
        conn.authId = cache.id;
        conn.save();
      }
    }

    const abortController = new AbortController();
    state(sId).connectionAbortController = abortController;

    let database = config.defaultDatabase || undefined;

    if (config.connectionType === 'surrealdb' && config?.surrealDbOptions?.namespace && database) {
      database = `${config?.surrealDbOptions?.namespace}::${database}`;
    }

    const settings = await UserSetting.all();
    const server = ConnectionProvider.for(config, osUser, settings);
    const connection = server.createConnection(database);
    await connection.connect(abortController.signal);
    // HACK (@day): this is because of type fuckery, need to actually just recreate the object but I'm lazy rn and it's late
    connection.connectionType = config.connectionType ?? (config as any)._connectionType;

    state(sId).server = server;
    state(sId).usedConfig = config;
    state(sId).connection = connection;
    state(sId).database = config.defaultDatabase;
    state(sId).generator = new SqlGenerator(dialectFor(config.connectionType), {
      dbConfig: connection.server.config,
      dbName: connection.database.database
    });
    state(sId).connectionAbortController = null
  },

  'conn/test': async function({ config, osUser, sId }: { config: IConnection, osUser: string, sId: string }) {
    // TODO (matthew): fix this mess.
    if (!osUser) {
      throw new Error(errorMessages.noUsername);
    }

    if (config.azureAuthOptions?.azureAuthEnabled && !config.authId) {
      let cache = new TokenCache();
      cache = await cache.save();
      config.authId = cache.id;
      // need to single out saved connections here (this may change when used connections are fixed)
      if (config.id) {
        // we do this so any temp configs that the user did aren't saved, just the id
        const conn = await SavedConnection.findOneBy({ id: config.id });
        conn.authId = cache.id;
        conn.save();
      }
    }

    let database = config.defaultDatabase || undefined;

    if (config.connectionType === 'surrealdb' && config?.surrealDbOptions?.namespace && database) {
      database = `${config.surrealDbOptions?.namespace}::${database}`;
    }

    const settings = await UserSetting.all();
    const server = ConnectionProvider.for(config, osUser, settings);
    const abortController = new AbortController();
    state(sId).connectionAbortController = abortController;
    await server?.createConnection(config.defaultDatabase || undefined).connect(abortController.signal);
    abortController.abort();
    server.disconnect();
    state(sId).connectionAbortController = null;
  },

  'conn/changeDatabase': async function({ newDatabase, sId }: { newDatabase: string, sId: string }) {
    if (!state(sId).server) {
      throw new Error(errorMessages.noServer);
    }

    let connection = state(sId).server.db(newDatabase);
    if (!connection) {
      connection = state(sId).server.createConnection(newDatabase);
      try {
        await connection.connect();
      } catch (e) {
        state(sId).server.destroyConnection(newDatabase);
        throw new Error(`Could not connect to database: ${e.message}`);
      }
    }

    state(sId).connection = connection;
    state(sId).database = newDatabase;
  },

  'conn/clearConnection': async function({ sId }: { sId: string}) {
    state(sId).connection = null;
    state(sId).server = null;
    state(sId).usedConfig = null;
    state(sId).database = null;
    state(sId).generator = null;
  },
  'conn/getServerConfig': async function({ sId }: { sId: string }) {
    return state(sId).server.getServerConfig();
  },

  // can only be used when the function doesn't have any arguments :sad:
  'conn/supportedFeatures': getDriverHandler('supportedFeatures'),
  'conn/versionString': getDriverHandler('versionString'),
  'conn/defaultSchema': getDriverHandler('defaultSchema'),
  'conn/listCharsets': getDriverHandler('listCharsets'),
  'conn/getDefaultCharset': getDriverHandler('getDefaultCharset'),

  'conn/listCollations': async function({ charset, sId }: { charset: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.listCollations(charset);
  },

  'conn/connect': getDriverHandler('connect'),
  'conn/disconnect': getDriverHandler('disconnect'),

  'conn/listTables': async function({ filter, sId }: { filter?: FilterOptions, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.listTables(filter);
  },

  'conn/listViews': async function({ filter, sId }: { filter?: FilterOptions, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.listViews(filter);
  },

  'conn/listRoutines': async function({ filter, sId }: { filter?: FilterOptions, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.listRoutines(filter);
  },

  'conn/listMaterializedViewColumns': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.listMaterializedViewColumns(table, schema);
  },

  'conn/listTableColumns': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.listTableColumns(table, schema);
  },

  'conn/listTableTriggers': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.listTableTriggers(table, schema);
  },

  'conn/listTableIndexes': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.listTableIndexes(table, schema);
  },

  'conn/listSchemas': async function({ filter, sId }: { filter?: SchemaFilterOptions, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.listSchemas(filter);
  },

  'conn/getTableReferences': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
      checkConnection(sId);
     return await state(sId).connection.getTableReferences(table, schema);
  },

  'conn/getTableKeys': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getTableKeys(table, schema);
  },

  'conn/getIncomingKeys': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getIncomingKeys(table, schema);
  },

  'conn/getOutgoingKeys': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getOutgoingKeys(table, schema);
  },

  'conn/listTablePartitions': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.listTablePartitions(table, schema);
  },

  'conn/executeCommand': async function({ commandText, sId }: { commandText: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.executeCommand(commandText);
  },

  'conn/query': async function({ queryText, options, tabId, hasActiveTransaction, sId }: { queryText: string, options?: any, tabId: number, hasActiveTransaction: boolean, sId: string }) {
    checkConnection(sId);
    const query = await state(sId).connection.query(queryText, tabId, options);
    const id = uuidv4();
    state(sId).queries.set(id, query);
    createOrResetTransactionTimeout(sId, tabId, !hasActiveTransaction);
    return id;
  },

  'conn/getCompletions': async function({ cmd, sId }: { cmd: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getCompletions(cmd);
  },

  'conn/getShellPrompt': async function({ sId }: { sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getShellPrompt();
  },

  'conn/executeQuery': async function({ queryText, options, sId }: { queryText: string, options?: any, sId: string}) {
    checkConnection(sId);
    return await state(sId).connection.executeQuery(queryText, options);
  },

  'conn/listDatabases': async function({ filter, sId }: { filter?: DatabaseFilterOptions, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.listDatabases(filter);
  },

  'conn/getTableProperties': async function({ table, schema, sId }: { table: string, schema?: string, sId: string}) {
    checkConnection(sId);
    return await state(sId).connection.getTableProperties(table, schema);
  },

  'conn/getQuerySelectTop': async function({ table, limit, schema, sId }: { table: string, limit: number, schema?: string, sId: string }) {
    checkConnection(sId);
    return state(sId).connection.getQuerySelectTop(table, limit, schema);
  },

  'conn/listMaterializedViews': async function({ filter, sId }: { filter?: FilterOptions, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.listMaterializedViews(filter);
  },

  'conn/getPrimaryKey': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getPrimaryKey(table, schema);
  },

  'conn/getPrimaryKeys': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getPrimaryKeys(table, schema);
  },

  'conn/createDatabase': async function({ databaseName, charset, collation, sId }: { databaseName: string, charset: string, collation: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.createDatabase(databaseName, charset, collation);
  },

  'conn/createDatabaseSQL': async function({ sId }: { sId: string }) {
    checkConnection(sId);
    return state(sId).connection.createDatabaseSQL();
  },

  'conn/getTableCreateScript': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getTableCreateScript(table, schema);
  },

  'conn/getViewCreateScript': async function({ view, schema, sId }: { view: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getViewCreateScript(view, schema);
  },

  'conn/getMaterializedViewCreateScript': async function({ view, schema, sId }: { view: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getMaterializedViewCreateScript(view, schema);
  },

  'conn/getRoutineCreateScript': async function({ routine, type, schema, sId }: { routine: string, type: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getRoutineCreateScript(routine, type, schema);
  },

  'conn/createTable': async function({ table, sId }: { table: CreateTableSpec, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.createTable(table);
  },

  'conn/getCollectionValidation': async function({ collection, sId }: { collection: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getCollectionValidation(collection);
  },

  'conn/setCollectionValidation': async function({ params, sId }: { params: any, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.setCollectionValidation(params);
  },

  'conn/alterTableSql': async function({ change, sId }: { change: AlterTableSpec, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.alterTableSql(change);
  },

  'conn/alterTable': async function({ change, sId }: { change: AlterTableSpec, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.alterTable(change);
  },

  'conn/alterIndexSql': async function({ changes, sId }: { changes: IndexAlterations, sId: string }) {
    checkConnection(sId);
    return state(sId).connection.alterIndexSql(changes);
  },

  'conn/alterIndex': async function({ changes, sId }: { changes: IndexAlterations, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.alterIndex(changes);
  },

  'conn/alterRelationSql': async function ({ changes, sId }: { changes: RelationAlterations, sId: string }) {
    checkConnection(sId);
    return state(sId).connection.alterRelationSql(changes);
  },

  'conn/alterRelation': async function({ changes, sId }: { changes: RelationAlterations, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.alterRelation(changes);
  },

  'conn/alterPartitionSql': async function({ changes, sId }: { changes: AlterPartitionsSpec, sId: string }){
    checkConnection(sId);
    return state(sId).connection.alterPartitionSql(changes);
  },

  'conn/alterPartition': async function({ changes, sId }: { changes: AlterPartitionsSpec, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.alterPartition(changes);
  },

  'conn/applyChangesSql': async function({ changes, sId }: { changes: TableChanges, sId: string }) {
    checkConnection(sId);
    return state(sId).connection.applyChangesSql(changes);
  },

  'conn/applyChanges': async function({ changes, sId }: { changes: TableChanges, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.applyChanges(changes);
  },

  'conn/setTableDescription': async function({ table, description, schema, sId }: { table: string, description: string, schema?: string, sId: string }) {
     checkConnection(sId);
     return await state(sId).connection.setTableDescription(table, description, schema);
  },

  'conn/setElementName': async function({ elementName, newElementName, typeOfElement, schema, sId }: { elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.setElementName(elementName, newElementName, typeOfElement, schema);
  },

  'conn/dropElement': async function({ elementName, typeOfElement, schema, sId }: { elementName: string, typeOfElement: DatabaseElement, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.dropElement(elementName, typeOfElement, schema);
  },

  'conn/truncateElement': async function({ elementName, typeOfElement, schema, sId }: {elementName: string, typeOfElement: DatabaseElement, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.truncateElement(elementName, typeOfElement, schema);
  },

  'conn/truncateAllTables': async function({ schema, sId }: { schema?: string, sId: string }) {
    checkConnection(sId);
    return state(sId).connection.truncateAllTables(schema);
  },

  'conn/getTableLength': async function({ table, schema, sId }: { table: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getTableLength(table, schema);
  },

  'conn/selectTop': async function({ table, offset, limit, orderBy, filters, schema, selects, sId }: { table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[], sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.selectTop(table, offset, limit, orderBy, filters, schema, selects);
  },

  'conn/selectTopSql': async function({ table, offset, limit, orderBy, filters, schema, selects, sId }: { table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[], sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.selectTopSql(table, offset, limit, orderBy, filters, schema, selects);
  },

  'conn/selectTopStream': async function({ table, orderBy, filters, chunkSize, schema, sId }: { table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.selectTopStream(table, orderBy, filters, chunkSize, schema);
  },

  'conn/queryStream': async function({ query, chunkSize, sId }: { query: string, chunkSize: number, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.queryStream(query, chunkSize);
  },

  'conn/duplicateTable': async function({ tableName, duplicateTableName, schema, sId }: { tableName: string, duplicateTableName: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.duplicateTable(tableName, duplicateTableName, schema);
  },

  'conn/duplicateTableSql': async function({ tableName, duplicateTableName, schema, sId }: { tableName: string, duplicateTableName: string, schema?: string, sId: string }) {
    checkConnection(sId);
    return state(sId).connection.duplicateTableSql(tableName, duplicateTableName, schema);
  },

  'conn/getInsertQuery': async function({ tableInsert, runAsUpsert, sId }: { tableInsert: TableInsert, runAsUpsert?: boolean, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getInsertQuery(tableInsert, runAsUpsert)
  },
  'conn/syncDatabase': getDriverHandler('syncDatabase'),

  'conn/azureCancelAuth': async function({ sId }: { sId: string }) {
    state(sId).connectionAbortController?.abort();
  },

  'conn/azureGetAccountName': async function({ authId }: { authId: number }) {
    if (!authId) {
      throw new Error("authId is required");
    };
    const cache = await TokenCache.findOneBy({id: authId})
    if (!cache) return null
    return cache.name
  },

  'conn/azureSignOut': async function({ config, sId }: { config: IConnection, sId: string }) {
    await AzureAuthService.ssoSignOut(config.authId)

    // Clean up authId cause it's invalid after signing out
    const savedConnection = await SavedConnection.findOneBy({id: config.id})
    savedConnection.authId = null
    await savedConnection.save()
    if (state(sId).usedConfig) {
      state(sId).usedConfig.authId = null
    }
  },

  'conn/getQueryForFilter': async function({ filter, sId }: { filter: TableFilter, sId: string }) {
    checkConnection(sId);
    return await state(sId).connection.getQueryForFilter(filter);
  },

  'conn/getFilteredDataCount': async function({ table, schema = null, filter, sId }: { table: string, schema: string | null, filter: string, sId: string }): Promise<string> {
    checkConnection(sId)
    return await state(sId).connection.getFilteredDataCount(table, schema, filter)
  },
  'conn/reserveConnection': async function({ tabId, sId }: { tabId: number, sId: string }) {
    checkConnection(sId);
    await state(sId).connection.reserveConnection(tabId);
  },

  'conn/releaseConnection': async function({ tabId, sId }: { tabId: number, sId: string }) {
    checkConnection(sId);
    await state(sId).connection.releaseConnection(tabId);
  },

  'conn/startTransaction': async function({ tabId, sId }: { tabId: number, sId: string }) {
    checkConnection(sId);
    await state(sId).connection.startTransaction(tabId);
    createOrResetTransactionTimeout(sId, tabId);
  },

  'conn/commitTransaction': async function({ tabId, sId }: { tabId: number, sId: string }) {
    checkConnection(sId);
    await state(sId).connection.commitTransaction(tabId);
    clearTransactionTimeout(sId, tabId);
  },

  'conn/rollbackTransaction': async function({ tabId, sId }: { tabId: number, sId: string }) {
    checkConnection(sId);
    await state(sId).connection.rollbackTransaction(tabId);
    clearTransactionTimeout(sId, tabId);
  },

  'conn/resetTransactionTimeout': async function({ tabId, sId }: { tabId: number, sId: string }) {
    createOrResetTransactionTimeout(sId, tabId, true);
  }
}

function clearTransactionTimeout(sId: string, tabId: number) {
  if (state(sId).transactionTimeouts.has(tabId)) {
    const timeout = state(sId).transactionTimeouts.get(tabId);
    state(sId).transactionTimeouts.delete(tabId);
    clearTimeout(timeout);
  }
}

function createOrResetTransactionTimeout(sId: string, tabId: number, mustExist: boolean = false) {
  if (mustExist && !state(sId).transactionTimeouts.has(tabId)) {
    return;
  }

  clearTransactionTimeout(sId, tabId);

  let connectionType: string = state(sId).connection.connectionType;
  connectionType = connectionType === 'postgresql' ? 'postgres' : connectionType;
  const timeout = setTimeout(() => {
    state(sId).port.postMessage({
      type: `transactionTimeoutWarning/${tabId}`
    });

    const warningWindowTimeout = setTimeout(async () => {
      checkConnection(sId);
      await state(sId).connection.rollbackTransaction(tabId);
      clearTransactionTimeout(sId, tabId);

      state(sId).port.postMessage({
        type: `transactionTimedOut/${tabId}`
      });

    }, bksConfig.db[connectionType].autoRollbackWarningWindow);

    state(sId).transactionTimeouts.set(tabId, warningWindowTimeout);

  }, bksConfig.db[connectionType].manualTransactionTimeout - bksConfig.db[connectionType].autoRollbackWarningWindow)
  state(sId).transactionTimeouts.set(tabId, timeout);
}
