import { Client } from 'pg';


const debug = require('../../debug')('db:clients:postgresql');
const REGEX_BEGIN_QUERY = /^(\n|\s)*/g;
const REGEX_BETWEEN_QUERIES = /;(\n|\s)*/g;
const REGEX_END_QUERY = /;/g;


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


export async function executeQuery(client, query) {
  const statements = query
    .replace(REGEX_BEGIN_QUERY, '')
    .replace(REGEX_BETWEEN_QUERIES, ';')
    .split(REGEX_END_QUERY)
    .filter(text => text.length);

  // pg does not throw an error for empty queries
  if (statements.length === 0) {
    throw new Error('Query was empty');
  }

  const queries = statements.map(statement =>
    executePromiseQuery(client, statement)
  );

  // Execute each statement in a different query
  // while node-postgres does not have support for multiple query results
  // https://github.com/brianc/node-postgres/pull/776
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
}


function executePromiseQuery(client, query) {
  // node-postgres has support for Promise query
  // but that always returns the "fields" property empty
  return new Promise((resolve, reject) => {
    client.query(query, (err, data) => {
      if (err) return reject(err);

      const isSelect = data.command === 'SELECT';
      resolve({
        rows: data.rows,
        fields: data.fields,
        rowCount: isSelect ? data.rowCount : undefined,
        affectedRows: !isSelect ? data.rowCount : undefined,
      });
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
  const result = await executeQuery(connection, `SELECT current_schema() AS schema`);
  return result.rows[0].schema;
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
    RESTART IDENTITY CASCADE;
  `));

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
