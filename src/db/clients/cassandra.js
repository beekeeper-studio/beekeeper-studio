import { Client } from 'cassandra-driver';
import { identify } from 'sql-query-identifier';

import createDebug from '../../debug';

const debug = createDebug('db:clients:cassandra');

/**
 * To keep compatibility with the other clients we treat keyspaces as database.
 */

export default function (server, database) {
  return new Promise(async (resolve, reject) => {
    const dbConfig = configDatabase(server, database);

    debug('creating database client %j', dbConfig);
    const client = new Client(dbConfig);

    debug('connecting');
    client.connect((err) => {
      if (err) {
        client.shutdown();
        return reject(err);
      }

      debug('connected');
      resolve({
        wrapIdentifier,
        disconnect: () => disconnect(client),
        listTables: (db) => listTables(client, db),
        listViews: () => listViews(client),
        listRoutines: () => listRoutines(client),
        listTableColumns: (db, table) => listTableColumns(client, db, table),
        listTableTriggers: (table) => listTableTriggers(client, table),
        listSchemas: () => listSchemas(client),
        getTableReferences: (table) => getTableReferences(client, table),
        getTableKeys: (db, table) => getTableKeys(client, db, table),
        query: (queryText) => executeQuery(client, queryText),
        executeQuery: (queryText) => executeQuery(client, queryText),
        listDatabases: () => listDatabases(client),
        getQuerySelectTop: (table, limit) => getQuerySelectTop(client, table, limit),
        getTableCreateScript: (table) => getTableCreateScript(client, table),
        getViewCreateScript: (view) => getViewCreateScript(client, view),
        getRoutineCreateScript: (routine) => getRoutineCreateScript(client, routine),
        truncateAllTables: (db) => truncateAllTables(client, db),
      });
    });
  });
}


export function disconnect(client) {
  client.shutdown();
}


export function listTables(client, database) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT table_name
      FROM system_schema.tables
      WHERE keyspace_name = ?
    `;
    const params = [database];
    client.execute(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => row.table_name));
    });
  });
}

export function listViews() {
  return Promise.resolve([]);
}

export function listRoutines() {
  return Promise.resolve([]);
}

export function listTableColumns(client, database, table) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT position, column_name, type
      FROM system_schema.columns
      WHERE keyspace_name = ?
        AND table_name = ?
    `;
    const params = [
      database,
      table,
    ];
    client.execute(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(
        data.rows
        // force pks be placed at the results beginning
        .sort((a, b) => b.position - a.position)
        .map((row) => ({
          columnName: row.column_name,
          dataType: row.type,
        }))
      );
    });
  });
}

export function listTableTriggers() {
  return Promise.resolve([]);
}

export function listSchemas() {
  return Promise.resolve([]);
}

export function getTableReferences() {
  return Promise.resolve([]);
}

export function getTableKeys(client, database, table) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT column_name
      FROM system_schema.columns
      WHERE keyspace_name = ?
        AND table_name = ?
        AND kind = 'partition_key'
      ALLOW FILTERING
    `;
    const params = [
      database,
      table,
    ];
    client.execute(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => ({
        constraintName: null,
        columnName: row.column_name,
        referencedTable: null,
        keyType: 'PRIMARY KEY',
      })));
    });
  });
}

function query(conn, queryText) { // eslint-disable-line no-unused-vars
  throw new Error('"query" function is not implementd by cassandra client.');
}

export function executeQuery(client, queryText) {
  const commands = identifyCommands(query);

  return new Promise((resolve, reject) => {
    client.execute(queryText, (err, data) => {
      if (err) return reject(err);

      resolve([parseRowQueryResult(data, commands[0])]);
    });
  });
}


export function listDatabases(client) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT keyspace_name FROM system_schema.keyspaces';
    const params = [];
    client.execute(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => row.keyspace_name));
    });
  });
}


export function getQuerySelectTop(client, table, limit) {
  return `SELECT * FROM ${wrapIdentifier(table)} LIMIT ${limit}`;
}

export function getTableCreateScript() {
  return Promise.resolve([]);
}

export function getViewCreateScript() {
  return Promise.resolve([]);
}

export function getRoutineCreateScript() {
  return Promise.resolve([]);
}

export function wrapIdentifier(value) {
  if (value === '*') return value;
  const matched = value.match(/(.*?)(\[[0-9]\])/); // eslint-disable-line no-useless-escape
  if (matched) return wrapIdentifier(matched[1]) + matched[2];
  return `"${value.replace(/"/g, '""')}"`;
}


export const truncateAllTables = async (connection, database) => {
  const sql = `
    SELECT table_name
    FROM system_schema.tables
    WHERE keyspace_name = '${database}'
  `;
  const [result] = await executeQuery(connection, sql);
  const tables = result.rows.map((row) => row.table_name);
  const promises = tables.map((t) => {
    const truncateSQL = `
      TRUNCATE TABLE ${wrapIdentifier(database)}.${wrapIdentifier(t)};
    `;
    return executeQuery(connection, truncateSQL);
  });

  await Promise.all(promises);
};

function configDatabase(server, database) {
  const config = {
    contactPoints: [server.config.host],
    protocolOptions: {
      port: server.config.port,
    },
    keyspace: database.database,
  };

  if (server.sshTunnel) {
    config.contactPoints = [server.config.localHost];
    config.protocolOptions.port = server.config.localPort;
  }

  if (server.config.ssl) {
    // TODO: sslOptions
  }

  return config;
}


function parseRowQueryResult(data, command) {
  // Fallback in case the identifier could not reconize the command
  const isSelect = command ? command === 'SELECT' : Array.isArray(data.rows);
  return {
    command: command || (isSelect && 'SELECT'),
    rows: data.rows || [],
    fields: data.columns || [],
    rowCount: isSelect ? (data.rowLength || 0) : undefined,
    affectedRows: !isSelect && !isNaN(data.rowLength) ? data.rowLength : undefined,
  };
}


function identifyCommands(queryText) {
  try {
    return identify(queryText);
  } catch (err) {
    return [];
  }
}
