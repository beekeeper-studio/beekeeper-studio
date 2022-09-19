// Copyright (c) 2015 The SQLECTRON Team, 2020 Beekeeper Studio team
import connectTunnel from './tunnel';
import clients from './clients';
import createLogger from '../logger';
import { SSHConnection } from '@/vendor/node-ssh-forward/index';
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, SchemaFilterOptions, DatabaseFilterOptions, TableChanges, TableUpdateResult, OrderBy, TableFilter, TableResult, StreamResults, CancelableQuery, ExtendedTableColumn, PrimaryKeyColumn, TableProperties, TableIndex, TableTrigger, TableInsert } from './models';
import { AlterTableSpec, IndexAlterations, RelationAlterations } from '@shared/lib/dialects/models';
import { RedshiftOptions } from '@/common/appdb/models/saved_connection';

const logger = createLogger('db');

export enum DatabaseElement {
  TABLE = 'TABLE',
  VIEW = 'VIEW',
  DATABASE = 'DATABASE'
}

export interface DatabaseClient {
  supportedFeatures: () => SupportedFeatures,
  versionString: () => string,
  disconnect: () => void,
  listTables: (db: string, filter?: FilterOptions) => Promise<TableOrView[]>,
  listViews: (filter?: FilterOptions) => Promise<TableOrView[]>,
  listRoutines: (filter?: FilterOptions) => Promise<Routine[]>,
  listMaterializedViewColumns: (db: string, table: string, schema?: string) => Promise<TableColumn[]>
  listTableColumns: (db: string, table?: string, schema?: string) => Promise<ExtendedTableColumn[]>,
  listTableTriggers: (table: string, schema?: string) => Promise<TableTrigger[]>,
  listTableIndexes: (db: string, table: string, schema?: string) => Promise<TableIndex[]>,
  listSchemas: (db: string, filter?: SchemaFilterOptions) => Promise<string[]>,
  getTableReferences: (table: string, schema?: string) => void,
  getTableKeys: (db: string, table: string, schema?: string) => void,
  query: (queryText: string) => CancelableQuery,
  executeQuery: (queryText: string) => void,
  listDatabases: (filter?: DatabaseFilterOptions) => Promise<string[]>,
  applyChanges: (changes: TableChanges) => Promise<TableUpdateResult[]>,
  // alter table
  alterTableSql: (change: AlterTableSpec) => Promise<string>,
  alterTable: (change: AlterTableSpec) => Promise<void>,

  alterIndexSql: (changes: IndexAlterations) => string | null
  alterIndex: (changes: IndexAlterations) => Promise<void>,

  alterRelationSql: (changes: RelationAlterations) => string | null
  alterRelation: (changes: RelationAlterations) => Promise<void>

  getInsertQuery: (tableInsert: TableInsert) => Promise<string>,
  getQuerySelectTop: (table: string, limit: number, schema?: string) => void,
  getTableProperties: (table: string, schema?: string) => Promise<TableProperties | null>,
  getTableCreateScript: (table: string, schema?: string) => Promise<string>,
  getViewCreateScript: (view: string) => void,
  getRoutineCreateScript: (routine: string, type: string, schema?: string) => void,
  truncateAllTables: (db: string, schema?: string) => void,
  listMaterializedViews: (filter?: FilterOptions) => Promise<TableOrView[]>,
  getPrimaryKey: (db: string, table: string, schema?: string) => Promise<string | null>,
  getPrimaryKeys: (db: string, table: string, schema?: string) => Promise<PrimaryKeyColumn[]>,
  // for tabletable
  getTableLength(table: string, schema?: string): Promise<number>
  selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: TableFilter[] | string, schema?: string, selects?: string[]): Promise<TableResult>,
  selectTopStream(db: string, table: string, orderBy: OrderBy[], filters: TableFilter[] | string, chunkSize: number, schema?: string ): Promise<StreamResults>,

  wrapIdentifier: (value: string) => string
  setTableDescription: (table: string, description: string, schema?: string) => Promise<string>

  // delete stuff
  dropElement: (elementName: string, typeOfElement: DatabaseElement, schema?: string) => Promise<void>
  truncateElement: (elementName: string, typeOfElement: DatabaseElement, schema?: string) => Promise<void>
}

export type IDbClients = keyof typeof clients

export interface IDbConnectionServerSSHConfig {
  host: Nullable<string>
  port: number
  user: Nullable<string>
  password: Nullable<string>
  privateKey: Nullable<string>
  passphrase: Nullable<string>
  bastionHost: Nullable<string>
  keepaliveInterval: number
  useAgent: boolean
}

export interface IDbConnectionServerConfig {
  client: Nullable<keyof typeof clients>,
  host?: string,
  port: Nullable<number>,
  domain: Nullable<string>,
  socketPath: Nullable<string>,
  socketPathEnabled: boolean,
  user: Nullable<string>,
  osUser: string,
  password: Nullable<string>,
  ssh: Nullable<IDbConnectionServerSSHConfig>,
  sslCaFile: Nullable<string>,
  sslCertFile: Nullable<string>,
  sslKeyFile: Nullable<string>,
  sslRejectUnauthorized: boolean,
  ssl: boolean
  localHost?: string,
  localPort?: number,
  trustServerCertificate?: boolean
  options?: any
  redshiftOptions?: RedshiftOptions
}

export interface IDbSshTunnel {
  connection: SSHConnection,
  localHost: string,
  localPort: number,
  tunnel: {}
}

export interface IDbConnectionServer {
  db: {
    [x: string]: DBConnection
  },
  sshTunnel?: Nullable<IDbSshTunnel>,
  config: IDbConnectionServerConfig,
}

export interface IDbConnectionDatabase {
  database: string,
  connection: Nullable<DatabaseClient>,
  connecting: boolean,
}

export class DBConnection {
  connectionType = this.server.config.client
  constructor (private server: IDbConnectionServer, private database: IDbConnectionDatabase) {}
  supportedFeatures = supportedFeatures.bind(null, this.server, this.database)
  connect = connect.bind(null, this.server, this.database)
  disconnect = disconnect.bind(null, this.server, this.database)
  end = disconnect.bind(null, this.server, this.database)
  listTables = listTables.bind(null, this.server, this.database)
  listViews = listViews.bind(null, this.server, this.database)
  listMaterializedViews = listMaterializedViews.bind(null, this.server, this.database)
  listRoutines = listRoutines.bind(null, this.server, this.database)
  listTableColumns = listTableColumns.bind(null, this.server, this.database)
  listMaterializedViewColumns = listMaterializedViewColumns.bind(null, this.server, this.database)
  listTableTriggers = listTableTriggers.bind(null, this.server, this.database)
  listTableIndexes = listTableIndexes.bind(null, this.server, this.database)
  listSchemas = listSchemas.bind(null, this.server, this.database)
  getTableReferences = getTableReferences.bind(null, this.server, this.database)
  getPrimaryKey = getPrimaryKey.bind(null, this.server, this.database)
  getPrimaryKeys = getPrimaryKeys.bind(null, this.server, this.database)
  getTableKeys = getTableKeys.bind(null, this.server, this.database)
  getTableProperties = getTableProperties.bind(null, this.server, this.database)
  query = query.bind(null, this.server, this.database)
  executeQuery = executeQuery.bind(null, this.server, this.database)
  listDatabases = listDatabases.bind(null, this.server, this.database)

  // tabletable
  getTableLength = bindAsync.bind(null, 'getTableLength', this.server, this.database)
  selectTop = selectTop.bind(null, this.server, this.database)
  selectTopStream = selectTopStream.bind(null, this.server, this.database)
  applyChanges = applyChanges.bind(null, this.server, this.database)

  // alter table
  alterTableSql = bind.bind(null, 'alterTableSql', this.server, this.database)
  alterTable = bindAsync.bind(null, 'alterTable', this.server, this.database)

  // indexes
  alterIndexSql = bind.bind(null, 'alterIndexSql', this.server, this.database)
  alterIndex = bindAsync.bind(null, 'alterIndex', this.server, this.database)

  alterRelationSql = bind.bind(null, 'alterRelationSql', this.server, this.database)
  alterRelation = bindAsync.bind(null, 'alterRelation', this.server, this.database)

  getInsertQuery = getInsertQuery.bind(null, this.server, this.database)
  getQuerySelectTop = getQuerySelectTop.bind(null, this.server, this.database)
  getTableCreateScript = getTableCreateScript.bind(null, this.server, this.database)
  getTableSelectScript = getTableSelectScript.bind(null, this.server, this.database)
  getTableInsertScript = getTableInsertScript.bind(null, this.server, this.database)
  getTableUpdateScript = getTableUpdateScript.bind(null, this.server, this.database)
  getTableDeleteScript = getTableDeleteScript.bind(null, this.server, this.database)
  getViewCreateScript = getViewCreateScript.bind(null, this.server, this.database)
  getRoutineCreateScript = getRoutineCreateScript.bind(null, this.server, this.database)
  truncateAllTables = truncateAllTables.bind(null, this.server, this.database)
  setTableDescription = setTableDescription.bind(null, this.server, this.database)

  // delete stuff
  dropElement = bindAsync.bind(null, 'dropElement', this.server, this.database)
  truncateElement = bindAsync.bind(null, 'truncateElement', this.server, this.database)

  async currentDatabase() {
    return this.database.database
  }
  versionString = versionString.bind(null, this.server, this.database)
}

export function createConnection(server: IDbConnectionServer, database: IDbConnectionDatabase ) {
  /**
   * Database public API
   */
  return new DBConnection(server, database)
}


async function connect(server: IDbConnectionServer, database: IDbConnectionDatabase) {
  /* eslint no-param-reassign: 0 */
  if (database.connecting) {
    throw new Error('There is already a connection in progress for this database. Aborting this new request.');
  }

  try {
    database.connecting = true;

    // terminate any previous lost connection for this DB
    if (database.connection) {
      database.connection.disconnect();
    }

    // reuse existing tunnel
    if (server.config.ssh && !server.sshTunnel) {
      logger().debug('creating ssh tunnel');
      server.sshTunnel = await connectTunnel(server.config);

      server.config.localHost = server.sshTunnel.localHost
      server.config.localPort = server.sshTunnel.localPort
    }

    if (server.config.client) {
      const driver = clients[server.config.client];

      const connection = await driver(server, database)
      database.connection = connection;
    }
  } catch (err) {
    logger().error('Connection error %j', err);
    disconnect(server, database);
    throw err;
  } finally {
    database.connecting = false;
  }
}


function disconnect(server: IDbConnectionServer, database: IDbConnectionDatabase): void {
  database.connecting = false;

  if (database.connection) {
    database.connection.disconnect();
    database.connection = null;
  }

  if (server.sshTunnel) {
    server.sshTunnel.connection.shutdown()
  }

  if (server.db[database.database]) {
    delete server.db[database.database];
  }
}

function supportedFeatures(server: IDbConnectionServer, database: IDbConnectionDatabase) {
  checkIsConnected(server, database)
  return database.connection?.supportedFeatures()
}

function selectTop(
  server: IDbConnectionServer,
  database: IDbConnectionDatabase,
  table: string,
  offset: number,
  limit: number,
  orderBy: OrderBy[],
  filters: TableFilter[] | string,
  schema: string,
  selects: string[],
): Promise<TableResult> {
  checkIsConnected(server, database)
  if (!database.connection) throw "No database connection available, please reconnect"
  return database.connection?.selectTop(table, offset, limit, orderBy, filters, schema, selects);
}

function selectTopStream(
  server: IDbConnectionServer,
  database: IDbConnectionDatabase,
  table: string,
  orderBy: OrderBy[],
  filters: TableFilter[] | string,
  chunkSize: number,
  schema?: string,
): Promise<StreamResults> {
  checkIsConnected(server, database)
  if (!database.connection) throw "No database connection available"
  return database.connection?.selectTopStream(database.database, table, orderBy, filters, chunkSize, schema)
}

function listSchemas(server: IDbConnectionServer, database: IDbConnectionDatabase, filter: SchemaFilterOptions) {
  checkIsConnected(server , database);
  return database.connection?.listSchemas(database.database, filter);
}

async function listTables(server: IDbConnectionServer, database: IDbConnectionDatabase, filter: FilterOptions) {
  checkIsConnected(server , database);
  return await database.connection?.listTables(database.database, filter) || [];
}

function listViews(server: IDbConnectionServer, database: IDbConnectionDatabase, filter: FilterOptions) {
  checkIsConnected(server , database);
  return database.connection?.listViews(filter) || [];
}

function listMaterializedViews(server: IDbConnectionServer, database: IDbConnectionDatabase, filter: FilterOptions) {
  checkIsConnected(server, database)
  return database.connection?.listMaterializedViews(filter) || []
}

function listRoutines(server: IDbConnectionServer, database: IDbConnectionDatabase, filter: FilterOptions) {
  checkIsConnected(server , database);
  return database.connection?.listRoutines(filter);
}

async function listTableColumns(
  server: IDbConnectionServer,
  database: IDbConnectionDatabase,
  table?: string,
  schema?: string): Promise<ExtendedTableColumn[]> {
  checkIsConnected(server , database);
  return await database.connection?.listTableColumns(database.database, table, schema) || Promise.resolve([]);
}

function listMaterializedViewColumns(
  server: IDbConnectionServer,
  database: IDbConnectionDatabase,
  table: string,
  schema?: string): Promise<TableColumn[]> {
  checkIsConnected(server , database);
  if (database.connection?.listMaterializedViewColumns) {
    return database.connection?.listMaterializedViewColumns(database.database, table, schema) || Promise.resolve([])
  } else {
    return Promise.resolve([])
  }
}

function listTableTriggers(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
  checkIsConnected(server , database);
  return database.connection?.listTableTriggers(table, schema);
}

function listTableIndexes(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
  checkIsConnected(server , database);
  return database.connection?.listTableIndexes(database.database, table, schema);
}

function getTableReferences(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
  checkIsConnected(server , database);
  return database.connection?.getTableReferences(table, schema);
}

function getPrimaryKey(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
  checkIsConnected(server, database)
  return database.connection?.getPrimaryKey(database.database, table, schema)
}

function getPrimaryKeys(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema?: string) {
  checkIsConnected(server, database)
  return database.connection?.getPrimaryKeys(database.database, table, schema)
}

function getTableKeys(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
  checkIsConnected(server , database);
  return database.connection?.getTableKeys(database.database, table, schema);
}

function getTableProperties(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema?: string) {
  checkIsConnected(server, database)
  return database.connection?.getTableProperties(table, schema)
}

function query(server: IDbConnectionServer, database: IDbConnectionDatabase, queryText: string) {
  checkIsConnected(server , database);
  return database.connection?.query(queryText);
}

function applyChanges(server: IDbConnectionServer, database: IDbConnectionDatabase, changes: TableChanges) {
  checkIsConnected(server, database)
  return database.connection?.applyChanges(changes)
}

function bind(functionName: string, server: IDbConnectionServer, database: IDbConnectionDatabase, ...args) {
  checkIsConnected(server, database)
  return database.connection[functionName](...args)
}

async function bindAsync(functionName: string, server: IDbConnectionServer, database: IDbConnectionDatabase, ...args ) {
  checkIsConnected(server, database)
  return await database.connection[functionName](...args)
}


function executeQuery(server: IDbConnectionServer, database: IDbConnectionDatabase, queryText: string) {
  checkIsConnected(server , database);
  return database.connection?.executeQuery(queryText);
}


function listDatabases(server: IDbConnectionServer, database: IDbConnectionDatabase, filter: DatabaseFilterOptions) {
  checkIsConnected(server , database);
  return database.connection?.listDatabases(filter);
}


async function getInsertQuery(server: IDbConnectionServer, database: IDbConnectionDatabase, tableInsert: TableInsert) {
  checkIsConnected(server , database);
  return database.connection?.getInsertQuery(tableInsert);
}

async function getQuerySelectTop(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string, limit: number) {
  checkIsConnected(server , database);
  return database.connection?.getQuerySelectTop(table, limit, schema);
}

function getTableCreateScript(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
  checkIsConnected(server , database);
  return database.connection?.getTableCreateScript(table, schema);
}

async function getTableSelectScript(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
  const columnNames = await getTableColumnNames(server, database, table, schema);
  const schemaSelection = resolveSchema(database, schema);
  return [
    `SELECT ${wrap(database, columnNames).join(', ')}`,
    `FROM ${schemaSelection}${wrap(database, table)};`,
  ].join(' ');
}


async function getTableInsertScript(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
  const columnNames = await getTableColumnNames(server, database, table, schema);
  const schemaSelection = resolveSchema(database, schema);
  return [
    `INSERT INTO ${schemaSelection}${wrap(database, table)}`,
    `(${wrap(database, columnNames).join(', ')})\n`,
    `VALUES (${columnNames.fill('?').join(', ')});`,
  ].join(' ');
}

async function getTableUpdateScript(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
  const columnNames = await getTableColumnNames(server, database, table, schema);
  const setColumnForm = wrap(database, columnNames).map((col) => `${col}=?`).join(', ');
  const schemaSelection = resolveSchema(database, schema);
  return [
    `UPDATE ${schemaSelection}${wrap(database, table)}\n`,
    `SET ${setColumnForm}\n`,
    'WHERE <condition>;',
  ].join(' ');
}

function getTableDeleteScript(_server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
  const schemaSelection = resolveSchema(database, schema);
  return [
    `DELETE FROM ${schemaSelection}${wrap(database, table)}`,
    'WHERE <condition>;',
  ].join(' ');
}

function getViewCreateScript(server: IDbConnectionServer, database: IDbConnectionDatabase, view: string /* , schema */) {
  checkIsConnected(server , database);
  return database.connection?.getViewCreateScript(view);
}

function getRoutineCreateScript(server: IDbConnectionServer, database: IDbConnectionDatabase, routine: string, type: string, schema: string) {
  checkIsConnected(server , database);
  return database.connection?.getRoutineCreateScript(routine, type, schema);
}

function truncateAllTables(_server: IDbConnectionServer, database: IDbConnectionDatabase, schema: string) {
  return database.connection?.truncateAllTables(database.database, schema);
}

function setTableDescription(_server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, description: string, schema?: string) {
  return database.connection?.setTableDescription(table, description, schema)
}

async function getTableColumnNames(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
  checkIsConnected(server , database);
  if (database.connection) {
    const columns = await database.connection?.listTableColumns(database.database, table, schema);
    return columns.map((column) => column.columnName);
  } else {
    return []
  }
}

function resolveSchema(database: IDbConnectionDatabase, schema: string) {
  return schema ? `${wrap(database, schema)}.` : '';
}

function wrap(database: IDbConnectionDatabase, identifier: string): string;
function wrap(database: IDbConnectionDatabase, identifier: string[]): string[];
function wrap(database: IDbConnectionDatabase, identifier: string | string[]): string | string[] {
  if (!Array.isArray(identifier)) {
    return database.connection?.wrapIdentifier(identifier) || '';
  }

  return identifier.map((item) => database.connection?.wrapIdentifier(item) || '');
}

function checkIsConnected(_server: IDbConnectionServer, database: IDbConnectionDatabase) {
  if (database.connecting || !database.connection) {
    throw new Error('There is no connection available.');
  }
}

function versionString(_server: IDbConnectionServer, database: IDbConnectionDatabase): string {
  return database.connection?.versionString();
}
