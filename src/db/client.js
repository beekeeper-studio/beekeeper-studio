import connectTunnel from './tunnel';
import clients from './clients';
import * as config from '../config';
import createDebug from '../debug';


const debug = createDebug('db');


const DEFAULT_LIMIT = 1000;
let limitSelect = null;


export function createConnection(server, database) {
  /**
   * Database public API
   */
  return {
    connect: connect.bind(null, server, database),
    disconnect: disconnect.bind(null, server, database),
    listTables: listTables.bind(null, server, database),
    listViews: listViews.bind(null, server, database),
    listRoutines: listRoutines.bind(null, server, database),
    listTableColumns: listTableColumns.bind(null, server, database),
    listTableTriggers: listTableTriggers.bind(null, server, database),
    listTableIndexes: listTableIndexes.bind(null, server, database),
    listSchemas: listSchemas.bind(null, server, database),
    getTableReferences: getTableReferences.bind(null, server, database),
    getTableKeys: getTableKeys.bind(null, server, database),
    query: query.bind(null, server, database),
    executeQuery: executeQuery.bind(null, server, database),
    listDatabases: listDatabases.bind(null, server, database),
    getQuerySelectTop: getQuerySelectTop.bind(null, server, database),
    getTableCreateScript: getTableCreateScript.bind(null, server, database),
    getTableSelectScript: getTableSelectScript.bind(null, server, database),
    getTableInsertScript: getTableInsertScript.bind(null, server, database),
    getTableUpdateScript: getTableUpdateScript.bind(null, server, database),
    getTableDeleteScript: getTableDeleteScript.bind(null, server, database),
    getViewCreateScript: getViewCreateScript.bind(null, server, database),
    getRoutineCreateScript: getRoutineCreateScript.bind(null, server, database),
    truncateAllTables: truncateAllTables.bind(null, server, database),
  };
}


async function connect(server, database) {
  /* eslint no-param-reassign: 0 */
  if (database.connecting) {
    throw new Error('There is already a connection in progress for this server. Aborting this new request.');
  }

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
      debug('creating ssh tunnel');
      server.sshTunnel = await connectTunnel(server.config);

      const { address, port } = server.sshTunnel.address();
      debug('ssh forwarding through local connection %s:%d', address, port);

      server.config.localHost = address;
      server.config.localPort = port;
    }

    const driver = clients[server.config.client];

    const [connection] = await Promise.all([
      driver(server, database),
      handleSSHError(server.sshTunnel),
    ]);

    database.connection = connection;
  } catch (err) {
    debug('Connection error %j', err);
    disconnect(server, database);
    throw err;
  } finally {
    database.connecting = false;
  }
}


function handleSSHError(sshTunnel) {
  return new Promise((resolve, reject) => {
    if (!sshTunnel) {
      return resolve();
    }

    sshTunnel.on('success', resolve);
    sshTunnel.on('error', (error) => {
      debug('ssh error %j', error);
      reject(error);
    });
  });
}


function disconnect(server, database) {
  database.connecting = false;

  if (database.connection) {
    database.connection.disconnect();
    database.connection = null;
  }

  if (server.db[database.database]) {
    delete server.db[database.database];
  }
}


function listTables(server, database, schema) {
  checkIsConnected(server, database);
  return database.connection.listTables(database.database, schema);
}

function listSchemas(server, database) {
  checkIsConnected(server, database);
  return database.connection.listSchemas(database.database);
}

function listViews(server, database, schema) {
  checkIsConnected(server, database);
  return database.connection.listViews(schema);
}

function listRoutines(server, database, schema) {
  checkIsConnected(server, database);
  return database.connection.listRoutines(schema);
}

function listTableColumns(server, database, table, schema) {
  checkIsConnected(server, database);
  return database.connection.listTableColumns(database.database, table, schema);
}

function listTableTriggers(server, database, table, schema) {
  checkIsConnected(server, database);
  return database.connection.listTableTriggers(table, schema);
}

function listTableIndexes(server, database, table, schema) {
  checkIsConnected(server, database);
  return database.connection.listTableIndexes(table, database.database, schema);
}

function getTableReferences(server, database, table, schema) {
  checkIsConnected(server, database);
  return database.connection.getTableReferences(table, schema);
}

function getTableKeys(server, database, table, schema) {
  checkIsConnected(server, database);
  return database.connection.getTableKeys(database.database, table, schema);
}

function query(server, database, queryText) {
  checkIsConnected(server, database);
  return database.connection.query(queryText);
}

function executeQuery(server, database, queryText) {
  checkIsConnected(server, database);
  return database.connection.executeQuery(queryText);
}


function listDatabases(server, database) {
  checkIsConnected(server, database);
  return database.connection.listDatabases();
}


async function getQuerySelectTop(server, database, table, schema, limit) {
  checkIsConnected(server, database);
  let limitValue = limit;
  if (typeof _limit === 'undefined') {
    await loadConfigLimit();
    limitValue = typeof limitSelect !== 'undefined' ? limitSelect : DEFAULT_LIMIT;
  }
  return database.connection.getQuerySelectTop(table, limitValue, schema);
}

function getTableCreateScript(server, database, table, schema) {
  checkIsConnected(server, database);
  return database.connection.getTableCreateScript(table, schema);
}

async function getTableSelectScript(server, database, table, schema) {
  const columnNames = await getTableColumnNames(server, database, table, schema);
  const schemaSelection = resolveSchema(database, schema);
  return [
    `SELECT ${wrap(database, columnNames).join(', ')}`,
    `FROM ${schemaSelection}${wrap(database, table)};`,
  ].join(' ');
}


async function getTableInsertScript(server, database, table, schema) {
  const columnNames = await getTableColumnNames(server, database, table, schema);
  const schemaSelection = resolveSchema(database, schema);
  return [
    `INSERT INTO ${schemaSelection}${wrap(database, table)}`,
    `(${wrap(database, columnNames).join(', ')})\n`,
    `VALUES (${columnNames.fill('?').join(', ')});`,
  ].join(' ');
}

async function getTableUpdateScript(server, database, table, schema) {
  const columnNames = await getTableColumnNames(server, database, table, schema);
  const setColumnForm = wrap(database, columnNames).map((col) => `${col}=?`).join(', ');
  const schemaSelection = resolveSchema(database, schema);
  return [
    `UPDATE ${schemaSelection}${wrap(database, table)}\n`,
    `SET ${setColumnForm}\n`,
    'WHERE <condition>;',
  ].join(' ');
}

function getTableDeleteScript(server, database, table, schema) {
  const schemaSelection = resolveSchema(database, schema);
  return [
    `DELETE FROM ${schemaSelection}${wrap(database, table)}`,
    'WHERE <condition>;',
  ].join(' ');
}

function getViewCreateScript(server, database, view /* , schema */) {
  checkIsConnected(server, database);
  return database.connection.getViewCreateScript(view);
}

function getRoutineCreateScript(server, database, routine, type, schema) {
  checkIsConnected(server, database);
  return database.connection.getRoutineCreateScript(routine, type, schema);
}

function truncateAllTables(server, database, schema) {
  return database.connection.truncateAllTables(database.database, schema);
}

async function getTableColumnNames(server, database, table, schema) {
  checkIsConnected(server, database);
  const columns = await database.connection.listTableColumns(database.database, table, schema);
  return columns.map((column) => column.columnName);
}

function resolveSchema(database, schema) {
  return schema ? `${wrap(database, schema)}.` : '';
}

function wrap(database, identifier) {
  if (!Array.isArray(identifier)) {
    return database.connection.wrapIdentifier(identifier);
  }

  return identifier.map((item) => database.connection.wrapIdentifier(item));
}

async function loadConfigLimit() {
  if (limitSelect === null) {
    const { limitQueryDefaultSelectTop } = await config.get();
    limitSelect = limitQueryDefaultSelectTop;
  }
  return limitSelect;
}


function checkIsConnected(server, database) {
  if (database.connecting || !database.connection) {
    throw new Error('There is no connection available.');
  }
}
