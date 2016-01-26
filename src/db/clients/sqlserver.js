import {Connection} from 'mssql';

const debug = require('../../debug')('db:clients:sqlserver');
const REGEX_BEGIN_QUERY = /^(\n|\s)*/g;
const REGEX_BETWEEN_QUERIES = /;(\n|\s)*/g;
const REGEX_END_QUERY = /;/g;


export default function(server, database) {
  return new Promise(async (resolve) => {
    database.connecting = true;

    const dbConfig = _configDatabase(server, database);

    debug('creating database connection %j', dbConfig);
    const connection = new Connection(dbConfig);

    connection.on('error', (error) => {
      database.connecting = false;
      debug('Connection error %j', error);
      connection.close();
    });

    debug('connecting');
    await connection.connect();
    debug('connected');

    resolve({
      disconnect: () => disconnect(connection),
      listTables: () => listTables(connection),
      executeQuery: (query) => executeQuery(connection, query),
      listDatabases: () => listDatabases(connection),
      getQuerySelectTop: (table, limit) => getQuerySelectTop(connection, table, limit),
      truncateAllTables: () => truncateAllTables(connection),
    });
  });
}


export const disconnect = (connection) => connection.close();
export const wrapQuery = (item) => `[${item}]`;
export const getQuerySelectTop = (client, table, limit) => `SELECT TOP ${limit} * FROM ${wrapQuery(table)}`;


const executePromiseQuery = (connection, query) => new Promise(async (resolve, reject) => {
  try {
    const realQuery = `${query}; SELECT @@ROWCOUNT as 'rowCount';`;
    const request = connection.request();
    const recordSet = await request.query(realQuery);
    const isSelect = !recordSet.length || (recordSet[0] && recordSet[0].rowCount === undefined);

    if (isSelect) {
      resolve({
        rows: recordSet,
        fields: Object.keys(recordSet[0] || {}).map(name => ({ name })),
        rowCount: recordSet.length,
        affectedRows: undefined,
      });
    } else {
      const rowCount = recordSet[0].rowCount;
      resolve({
        rows: [],
        fields: [],
        rowCount: undefined,
        affectedRows: rowCount,
      });
    }
  } catch (e) {
    reject(e);
  }
});


export const executeQuery = async (connection, query) => {
  const statements = query
    .replace(REGEX_BEGIN_QUERY, '')
    .replace(REGEX_BETWEEN_QUERIES, ';')
    .split(REGEX_END_QUERY)
    .filter(text => text.length);

  const queries = statements.map(statement => executePromiseQuery(connection, statement));

  const results = await Promise.all(queries);
  if (statements.length === 1) {
    return results[0];
  }

  return results.reduce((allResults, result) => {
    allResults.rows.push(result.rows);
    allResults.fields.push(result.fields);
    allResults.rowCount.push(result.rowCount);
    allResults.affectedRows.push(result.affectedRows);
    return allResults;
  }, { rows: [], fields: [], rowCount: [], affectedRows: [] });
};


const getSchema = async (connection) => {
  const result = await executeQuery(connection, `SELECT schema_name() AS 'schema'`);
  return result.rows[0].schema;
};


export const listTables = async (connection) => {
  const sql = `
    SELECT table_name
    FROM information_schema.tables
    ORDER BY table_name
  `;
  const result = await executeQuery(connection, sql);
  return result.rows.map(row => row.table_name);
};


export const listDatabases = async (connection) => {
  const result = await executeQuery(connection, 'SELECT name FROM sys.databases');
  return result.rows.map(row => row.name);
};


export const truncateAllTables = async (connection) => {
  const schema = await getSchema(connection);
  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = '${schema}'
  `;
  const result = await executeQuery(connection, sql);
  const tables = result.rows.map(row => row.table_name);
  const promises = tables.map(t => executeQuery(connection, `
    TRUNCATE TABLE ${wrapQuery(schema)}.${wrapQuery(t)}
  `));

  await Promise.all(promises);
};


function _configDatabase(server, database) {
  const config = {
    user: server.config.user,
    password: server.config.password,
    server: server.config.host,
    database: database.database,
    port: server.config.port,
    options: {
      encrypt: server.config.ssl,
    },
  };

  if (server.sshTunnel) {
    config.server = server.config.localHost;
    config.port = server.config.localPort;
  }

  return config;
}
