import { join } from 'path';
import { exists } from 'fs';
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


export function createSession() {
  const session = {
    connecting: false,
    connection: null,
  };

  return {
    connect: connect.bind(null, session),
    disconnect: disconnect.bind(null, session),
    listTables: listTables.bind(null, session),
    executeQuery: executeQuery.bind(null, session),
    listDatabases: listDatabases.bind(null, session),
    getQuerySelectTop: getQuerySelectTop.bind(null, session),
    truncateAllTables: truncateAllTables.bind(null, session),
  };
}


async function connect(session, serverInfo, databaseName) {
  if (session.connecting) {
    throw new Error('There is already a connection in progress. Aborting this new request.');
  }

  try {
    session.connecting = true;

    if (session.connection) {
      session.connection.disconnect();
    }

    const clientExists = await _clientExits(serverInfo.client);
    if (!clientExists) {
      throw new Error('Invalid SQL client');
    }

    const driver = require(`./clients/${serverInfo.client}`).default;

    session.connection = await driver(serverInfo, databaseName);
  } catch (err) {
    throw err;
  } finally {
    session.connecting = false;
  }
}


function disconnect(session) {
  session.connecting = false;
  session.connection = null;
  session.connection.disconnect();
}


async function listTables(session) {
  _checkIsConnected(session);
  return session.connection.listTables();
}


async function executeQuery(session, query) {
  _checkIsConnected(session);
  return session.connection.executeQuery(query);
}


async function listDatabases(session) {
  _checkIsConnected(session);
  return session.connection.listDatabases();
}


async function getQuerySelectTop(session, table, limit) {
  _checkIsConnected(session);
  let _limit = limit;
  if (typeof _limit === 'undefined') {
    await loadConfigLimit();
    _limit = typeof limitSelect !== 'undefined' ? limitSelect : DEFAULT_LIMIT;
  }
  return session.connection.getQuerySelectTop(table, _limit);
}

function truncateAllTables(session) {
  return session.connection.truncateAllTables();
}


async function loadConfigLimit() {
  if (limitSelect === null) {
    const { limitQueryDefaultSelectTop } = await config.get();
    limitSelect = limitQueryDefaultSelectTop;
  }
  return limitSelect;
}


function _checkIsConnected(session) {
  if (session.connecting || !session.connection) {
    throw new Error('There is no connection available.');
  }
}


function _clientExits(client) {
  const pathClient = join(__dirname, 'clients', `${client}.js`);
  return new Promise(resolve => exists(pathClient, resolve));
}
