import * as config from '../config';


/**
 * List of supported database clients
 */
export const CLIENTS = [
  { key: 'mysql', name: 'MySQL' },
  { key: 'postgresql', name: 'PostgreSQL' },
  { key: 'sqlserver', name: 'Microsoft SQL Server' },
];


const DEFAULT_LIMIT = 1000;
let limitSelect = null;
let connecting = false;
let connection = null;


export async function connect(serverInfo, databaseName) {
  if (connecting) throw new Error('connecting to server');

  try {
    connecting = true;

    if (connection) connection.disconnect();

    const driver = require(`./clients/${serverInfo.client}`).default;

    connection = await driver(serverInfo, databaseName);
  } catch (err) {
    throw err;
  } finally {
    connecting = false;
  }
}


export async function listTables() {
  _checkIsConnected();
  return await connection.listTables();
}


export async function executeQuery(query) {
  _checkIsConnected();
  return await connection.executeQuery(query);
}


export async function listDatabases() {
  _checkIsConnected();
  return await connection.listDatabases();
}


export async function getQuerySelectTop(table, limit) {
  _checkIsConnected();
  let _limit = limit;
  if (typeof _limit === 'undefined') {
    await loadConfigLimit();
    _limit = typeof limitSelect !== 'undefined' ? limitSelect : DEFAULT_LIMIT;
  }
  return connection.getQuerySelectTop(table, _limit);
}

export function truncateAllTables() {
  return connection.truncateAllTables();
}


async function loadConfigLimit() {
  if (limitSelect === null) {
    const { limitQueryDefaultSelectTop } = await config.get();
    limitSelect = limitQueryDefaultSelectTop;
  }
  return limitSelect;
}


function _checkIsConnected() {
  if (connecting || !connection) {
    throw new Error('connecting to server');
  }
}
