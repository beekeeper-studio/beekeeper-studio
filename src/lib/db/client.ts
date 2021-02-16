// Copyright (c) 2015 The SQLECTRON Team
import connectTunnel from './tunnel';
import clients from './clients';
import createLogger from '../logger';
import { SSHConnection } from 'node-ssh-forward';

const logger = createLogger('db');
const DEFAULT_LIMIT = 1000;
const limitSelect: Nullable<number> = null;

export interface TableOrView {
  schema: string,
  name: string,
  entityType?: 'table' | 'view' | 'materialized-view'
  columns?: TableColumn[]
}

export interface TableColumn {
  columnName: string,
  dataType: string,
  schemaName?: string,
  tableName?: string,
}

export interface FilterOptions {
  schema: Nullable<string>
  only?: string[]
  ignore?: string[]
  tables?: string[]
}

export interface DatabaseFilterOptions {
  database?: string
  only?: string[]
  ignore?: string[]
}

export interface SchemaFilterOptions {
  schema?: string
  only?: string[]
  ignore?: string[]
}

export interface OrderBy {
  dir: 'ASC' | 'DESC',
  field: string
}

export interface TableFilter {
  field: string
  type: string
  value: string
}

export interface IDbInsertValue {
  column: TableColumn[],
  value: string
}

export interface IDbInsert {
  table: string,
  values: IDbInsertValue[],
}

export interface TableResult {
  result: any[],
  fields: string[]
  totalRecords: Number
}

export interface TableChanges {
  updates: TableUpdate[],
  deletes: TableDelete[]
}

export interface TableUpdate {
  table: string
  column: string
  pkColumn: string
  primaryKey: any
  schema?: string
  columnType?: string,
  value: any
}

export interface TableDelete {
  table: string,
  pkColumn: string,
  schema?: string,
  primaryKey: string
}

export interface TableKey {
  toTable: string
  toSchema: string
  toColumn: string
  fromTable: string
  fromSchema: string
  fromColumn: string
  constraintName: string
  onUpdate?: string
  onDelete?: string
}

export type TableUpdateResult = any

export interface RoutineParam {
  name: string
  type: string
  length?: number
}

// TODO (matthew): Currently only supporting function and procedure
export type RoutineType = 'function' | 'window' | 'aggregate' | 'procedure'

export const RoutineTypeNames = {
  'function': "Function",
  'window': "Window Function",
  'aggregate': "Aggregate Function",
  'procedure': "Stored Procedure"
}

export interface Routine {
  id: string
  schema?: string
  name: string
  returnType: string
  returnTypeLength?: number
  routineParams?: RoutineParam[]
  pinned?: boolean
  type: RoutineType
}

export interface SupportedFeatures {
  customRoutines: boolean,
}

export interface FieldDescriptor {
  name: string
  id: string
  dataType?: string
}

export interface NgQueryResult {
  fields: FieldDescriptor[]
  rows: any[]
  rowCount?: number
  affectedRows?: number
  command?: any
}

export type QueryResult = NgQueryResult[]

export interface CancelableQuery {
  execute: () => Promise<QueryResult>
  cancel: () => Promise<void>
}

export interface DatabaseClient {
  supportedFeatures: () => SupportedFeatures
  disconnect: () => void,
  listTables: (db: string, filter?: FilterOptions) => Promise<TableOrView[]>,
  listViews: (filter?: FilterOptions) => Promise<TableOrView[]>,
  listRoutines: (filter?: FilterOptions) => Promise<Routine[]>,
  listMaterializedViewColumns: (db: string, table: string, schema?: string) => Promise<TableColumn[]>
  listTableColumns: (db: string, table?: string, schema?: string) => Promise<TableColumn[]>,
  listTableTriggers: (table: string, schema?: string) => void,
  listTableIndexes: (db: string, table: string, schema?: string) => void,
  listSchemas: (db: string, filter?: SchemaFilterOptions) => Promise<string[]>,
  getTableReferences: (table: string, schema?: string) => void,
  getTableKeys: (db: string, table: string, schema?: string) => void,
  query: (queryText: string) => void,
  executeQuery: (queryText: string) => void,
  listDatabases: (filter?: DatabaseFilterOptions) => Promise<string[]>,
  applyChanges: (changes: TableChanges) => Promise<TableUpdateResult[]>,
  getQuerySelectTop: (table: string, limit: number, schema?: string) => void,
  getTableCreateScript: (table: string, schema?: string) => void,
  getViewCreateScript: (view: string) => void,
  getRoutineCreateScript: (routine: string, type: string, schema?: string) => void,
  truncateAllTables: (db: string, schema?: string) => void,
  listMaterializedViews: (filter?: FilterOptions) => Promise<TableOrView[]>,
  getPrimaryKey: (db: string, table: string, schema?: string) => Promise<string>,
  selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: TableFilter[], schema?: string): Promise<TableResult>,
  wrapIdentifier: (value: string) => string
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
  useAgent: boolean
}

export interface IDbConnectionServerConfig {
  client: Nullable<keyof typeof clients>,
  host?: string,
  port: Nullable<number>,
  domain: Nullable<string>,
  socketPath: Nullable<string>,
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
  getTableKeys = getTableKeys.bind(null, this.server, this.database)
  query = query.bind(null, this.server, this.database)
  executeQuery = executeQuery.bind(null, this.server, this.database)
  listDatabases = listDatabases.bind(null, this.server, this.database)
  selectTop = selectTop.bind(null, this.server, this.database)
  applyChanges = applyChanges.bind(null, this.server, this.database)
  getQuerySelectTop = getQuerySelectTop.bind(null, this.server, this.database)
  getTableCreateScript = getTableCreateScript.bind(null, this.server, this.database)
  getTableSelectScript = getTableSelectScript.bind(null, this.server, this.database)
  getTableInsertScript = getTableInsertScript.bind(null, this.server, this.database)
  getTableUpdateScript = getTableUpdateScript.bind(null, this.server, this.database)
  getTableDeleteScript = getTableDeleteScript.bind(null, this.server, this.database)
  getViewCreateScript = getViewCreateScript.bind(null, this.server, this.database)
  getRoutineCreateScript = getRoutineCreateScript.bind(null, this.server, this.database)
  truncateAllTables = truncateAllTables.bind(null, this.server, this.database)
  connectionType: Nullable<IDbClients> = null
  async currentDatabase() {
    return this.database.database
  }
}

export function createConnection(server: IDbConnectionServer, database: IDbConnectionDatabase, cryptoSecret?: string) {
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
  filters: TableFilter[],
  schema: string): Promise<TableResult> {
  checkIsConnected(server, database)
  if (!database.connection) throw "No database connection available, please reconnect"
  return database.connection?.selectTop(table, offset, limit, orderBy, filters, schema);
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
  schema?: string): Promise<TableColumn[]> {
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

function getTableKeys(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
  checkIsConnected(server , database);
  return database.connection?.getTableKeys(database.database, table, schema);
}

function query(server: IDbConnectionServer, database: IDbConnectionDatabase, queryText: string) {
  checkIsConnected(server , database);
  return database.connection?.query(queryText);
}

function applyChanges(server: IDbConnectionServer, database: IDbConnectionDatabase, changes: TableChanges) {
  checkIsConnected(server, database)
  return database.connection?.applyChanges(changes)
}

function executeQuery(server: IDbConnectionServer, database: IDbConnectionDatabase, queryText: string) {
  checkIsConnected(server , database);
  return database.connection?.executeQuery(queryText);
}


function listDatabases(server: IDbConnectionServer, database: IDbConnectionDatabase, filter: DatabaseFilterOptions) {
  checkIsConnected(server , database);
  return database.connection?.listDatabases(filter);
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

function getTableDeleteScript(server: IDbConnectionServer, database: IDbConnectionDatabase, table: string, schema: string) {
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

function truncateAllTables(server: IDbConnectionServer, database: IDbConnectionDatabase, schema: string) {
  return database.connection?.truncateAllTables(database.database, schema);
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

function checkIsConnected(server: IDbConnectionServer, database: IDbConnectionDatabase) {
  if (database.connecting || !database.connection) {
    console.log(database)
    throw new Error('There is no connection available.');
  }
}
