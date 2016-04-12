import { Client } from 'pg';


const debug = require('../../debug')('db:clients:postgresql');


export default function(server, database) {
  return new Promise(async (resolve, reject) => {
    const dbConfig = _configDatabase(server, database);

    debug('creating database client %j', dbConfig);
    const client = new Client(dbConfig);

    debug('connecting');
    client.connect(err => {
      if (err) {
        client.end();
        return reject(err);
      }

      debug('connected');
      resolve({
        wrapQuery,
        disconnect: () => disconnect(client),
        listTables: () => listTables(client),
        listViews: () => listViews(client),
        listRoutines: () => listRoutines(client),
        executeQuery: (query) => executeQuery(client, query),
        listDatabases: () => listDatabases(client),
        getQuerySelectTop: (table, limit) => getQuerySelectTop(client, table, limit),
        truncateAllTables: () => truncateAllTables(client),
      });
    });
  });
}


export function disconnect(client) {
  client.end();
}


export function listTables(client) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      AND table_type NOT LIKE '%VIEW%'
      ORDER BY table_name
    `;
    const params = [
      'public',
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map(row => row.table_name));
    });
  });
}

export function listViews(client) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = $1
      ORDER BY table_name
    `;
    const params = [
      'public',
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map(row => row.table_name));
    });
  });
}

export function listRoutines(client) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = $1
      ORDER BY routine_name
    `;
    const params = [
      'public',
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map(row => ({
        routineName: row.routine_name,
        routineType: row.routine_type,
      })));
    });
  });
}

export async function executeQuery(client, query) {
  // node-postgres has support for Promise query
  // but that always returns the "fields" property empty
  return new Promise((resolve, reject) => {
    client.query({ text: query, multiResult: true}, (err, data) => {
      if (err) return reject(err);

      resolve(data.map(parseRowQueryResult));
    });
  });
}


export function listDatabases(client) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT datname
      FROM pg_database
      WHERE datistemplate = $1
      ORDER BY datname
    `;
    const params = [ false ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map(row => row.datname));
    });
  });
}


export function getQuerySelectTop(client, table, limit) {
  return `SELECT * FROM ${wrapQuery(table)} LIMIT ${limit}`;
}


export function wrapQuery(item) {
  return `"${item}"`;
}

const getSchema = async (connection) => {
  const [result] = await executeQuery(connection, `SELECT current_schema() AS schema`);
  return result.rows[0].schema;
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
  const promises = tables.map(t => {
    const truncateSQL = `
      TRUNCATE TABLE ${wrapQuery(schema)}.${wrapQuery(t)}
      RESTART IDENTITY CASCADE;
    `;
    return executeQuery(connection, truncateSQL);
  });

  await Promise.all(promises);
};

function _configDatabase(server, database) {
  const config = {
    host: server.config.host,
    port: server.config.port,
    user: server.config.user,
    password: server.config.password,
    database: database.database,
  };

  if (server.sshTunnel) {
    config.host = server.config.localHost;
    config.port = server.config.localPort;
  }

  return config;
}


function parseRowQueryResult(data) {
  const isSelect = data.command === 'SELECT';
  return {
    isSelect,
    rows: data.rows,
    fields: data.fields,
    rowCount: isSelect ? data.rowCount : undefined,
    affectedRows: !isSelect ? data.rowCount : undefined,
  };
}
