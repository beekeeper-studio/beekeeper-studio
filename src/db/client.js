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
    executeQuery: executeQuery.bind(null, server, database),
    listDatabases: listDatabases.bind(null, server, database),
    getQuerySelectTop: getQuerySelectTop.bind(null, server, database),
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

      const localPort = server.sshTunnel.address().port;
      debug('ssh forwarding through local port connection %d', localPort);

      server.config.localHost = '127.0.0.1';
      server.config.localPort = localPort;

      server.sshTunnel.on('error', error => {
        debug('ssh error %j', error);
        database.connecting = false;
      });
    }

    const driver = clients[server.config.client];

    database.connection = await driver(server, database);
  } catch (err) {
    debug('Connection error %j', err);
    disconnect(server, database);
    throw err;
  } finally {
    database.connecting = false;
  }
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

function truncateAllTables(server, database) {
  return database.connection.truncateAllTables();
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
