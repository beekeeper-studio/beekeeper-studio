import connectTunnel from './tunnel';
import clients from './clients';
import * as config from '../config';


const debug = require('../debug')('db');


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
    getTableReferences: getTableReferences.bind(null, server, database),
    getTableKeys: getTableKeys.bind(null, server, database),
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
    sshTunnel.on('error', error => {
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


async function listTables(server, database) {
  checkIsConnected(server, database);
  return database.connection.listTables();
}

async function listViews(server, database) {
  checkIsConnected(server, database);
  return database.connection.listViews();
}

async function listRoutines(server, database) {
  checkIsConnected(server, database);
  return database.connection.listRoutines();
}

async function listTableColumns(server, database, table) {
  checkIsConnected(server, database);
  return database.connection.listTableColumns(table);
}

async function listTableTriggers(server, database, table) {
  checkIsConnected(server, database);
  return database.connection.listTableTriggers(table);
}

async function getTableReferences(server, database, table) {
  checkIsConnected(server, database);
  return database.connection.getTableReferences(table);
}

async function getTableKeys(server, database, table) {
  checkIsConnected(server, database);
  return database.connection.getTableKeys(table);
}

async function executeQuery(server, database, query) {
  checkIsConnected(server, database);
  return database.connection.executeQuery(query);
}


async function listDatabases(server, database) {
  checkIsConnected(server, database);
  return database.connection.listDatabases();
}


async function getQuerySelectTop(server, database, table, limit) {
  checkIsConnected(server, database);
  let _limit = limit;
  if (typeof _limit === 'undefined') {
    await loadConfigLimit();
    _limit = typeof limitSelect !== 'undefined' ? limitSelect : DEFAULT_LIMIT;
  }
  return database.connection.getQuerySelectTop(table, _limit);
}

async function getTableCreateScript(server, database, table) {
  checkIsConnected(server, database);
  return database.connection.getTableCreateScript(table);
}

async function getTableSelectScript(server, database, table) {
  const columnNames = await getTableColumnNames(server, database, table);
  return `SELECT ${columnNames.join(', ')} FROM ${database.connection.wrapIdentifier(table)};`;
}


async function getTableInsertScript(server, database, table) {
  const columnNames = await getTableColumnNames(server, database, table);
  return `INSERT INTO ${database.connection.wrapIdentifier(table)} (${columnNames.join(', ')})\n VALUES (${columnNames.fill('?').join(', ')});`;
}

async function getTableUpdateScript(server, database, table) {
  const columnNames = await getTableColumnNames(server, database, table);
  const setColumnForm = columnNames.map(columnName => `${columnName}=?`).join(', ');
  const condition = '<condition>';
  return `UPDATE ${database.connection.wrapIdentifier(table)}\n   SET ${setColumnForm}\n WHERE ${condition};`;
}

async function getTableDeleteScript(server, database, table) {
  const condition = '<condition>';
  return `DELETE FROM ${database.connection.wrapIdentifier(table)} WHERE ${condition};`;
}

async function getViewCreateScript(server, database, view) {
  checkIsConnected(server, database);
  return database.connection.getViewCreateScript(view);
}

async function getRoutineCreateScript(server, database, routine, type) {
  checkIsConnected(server, database);
  return database.connection.getRoutineCreateScript(routine, type);
}

function truncateAllTables(server, database) {
  return database.connection.truncateAllTables();
}

async function getTableColumnNames(server, database, table) {
  checkIsConnected(server, database);
  const columns = await database.connection.listTableColumns(table);
  return columns.map(column => column.columnName);
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
