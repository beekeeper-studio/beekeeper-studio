import {Connection} from 'mssql';


const debug = require('../../debug')('db:clients:sqlserver');


export default async function(server, database) {
  let connection;
  try {
    const dbConfig = _configDatabase(server, database);

    debug('creating database connection %j', dbConfig);
    connection = new Connection(dbConfig);

    debug('connecting');
    await connection.connect();

    debug('connected');
    return {
      disconnect: () => disconnect(connection),
      listTables: () => listTables(connection),
      listViews: () => listViews(connection),
      listRoutines: () => listRoutines(connection),
      listTableColumns: (table) => listTableColumns(connection, table),
      listTableTriggers: (table) => listTableTriggers(connection, table),
      executeQuery: (query) => executeQuery(connection, query),
      listDatabases: () => listDatabases(connection),
      getQuerySelectTop: (table, limit) => getQuerySelectTop(connection, table, limit),
      truncateAllTables: () => truncateAllTables(connection),
    };
  } catch (err) {
    if (connection) {
      connection.close();
    }
    throw err;
  }
}


export const disconnect = (connection) => connection.close();
export const wrapQuery = (item) => `[${item}]`;
export const getQuerySelectTop = (client, table, limit) => `SELECT TOP ${limit} * FROM ${wrapQuery(table)}`;


export const executeQuery = async (connection, query) => {
  const request = connection.request();
  request.multiple = true;

  const recordSet = await request.query(query);

  // Executing only non select queries will not return results.
  // So we "fake" there is at least one result.
  const results = !recordSet.length && request.rowsAffected ? [[]] : recordSet;

  return results.map((_, idx) => parseRowQueryResult(results[idx], request));
};


const getSchema = async (connection) => {
  const [result] = await executeQuery(connection, `SELECT schema_name() AS 'schema'`);
  return result.rows[0].schema;
};


export const listTables = async (connection) => {
  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_type NOT LIKE '%VIEW%'
    ORDER BY table_name
  `;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => row.table_name);
};

export const listViews = async (connection) => {
  const sql = `
    SELECT table_name
    FROM information_schema.views
    ORDER BY table_name
  `;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => row.table_name);
};

export const listRoutines = async (connection) => {
  const sql = `
    SELECT routine_name, routine_type
    FROM information_schema.routines
    ORDER BY routine_name
  `;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => ({
    routineName: row.routine_name,
    routineType: row.routine_type,
  }));
};

export const listTableColumns = async (connection, table) => {
  const sql = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = '${table}'
  `;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => ({
    columnName: row.column_name,
    dataType: row.data_type,
  }));
};

export const listTableTriggers = async (connection, table) => {
  // SQL Server does not have information_schema for triggers, so other way around
  // is using sp_helptrigger stored procedure to fetch triggers related to table
  const sql = `
    EXEC sp_helptrigger ${wrapQuery(table)}
  `;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => row.trigger_name);
};

export const listDatabases = async (connection) => {
  const [result] = await executeQuery(connection, 'SELECT name FROM sys.databases');
  return result.rows.map(row => row.name);
};


export const truncateAllTables = async (connection) => {
  const schema = await getSchema(connection);
  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = '${schema}'
    AND table_type NOT LIKE '%VIEW%'
  `;
  const [result] = await executeQuery(connection, sql);
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


function parseRowQueryResult(data, request) {
  // TODO: find a better way without hacks to detect if it is a select query
  // This current approach will not work properly in some cases
  const isSelect = !!(data.length || !request.rowsAffected);

  return {
    isSelect,
    rows: data,
    fields: Object.keys(data[0] || {}).map(name => ({ name })),
    rowCount: data.length,
    affectedRows: request.rowsAffected,
  };
}
