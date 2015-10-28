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


export function getQuerySelectTop(table, limit = 1000) {
  _checkIsConnected();
  return connection.getQuerySelectTop(table, limit);
}


function _checkIsConnected() {
  if (connecting || !connection) {
    throw new Error('connecting to server');
  }
}
