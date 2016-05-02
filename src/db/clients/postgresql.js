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
        listTableColumns: (table) => listTableColumns(client, table),
        listTableTriggers: (table) => listTableTriggers(client, table),
        executeQuery: (query) => executeQuery(client, query),
        listDatabases: () => listDatabases(client),
        getQuerySelectTop: (table, limit) => getQuerySelectTop(client, table, limit),
        getTableCreateScript: (table) => getTableCreateScript(client, table),
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
      SELECT routine_name, routine_type, routine_definition
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
        routineDefinition: row.routine_definition,
      })));
    });
  });
}

export function listTableColumns(client, table) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = $1
      AND table_name = $2
    `;
    const params = [
      'public',
      table,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map(row => ({
        columnName: row.column_name,
        dataType: row.data_type,
      })));
    });
  });
}

export function listTableTriggers(client, table) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_schema = $1
      AND event_object_table = $2
    `;
    const params = [
      'public',
      table,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map(row => row.trigger_name));
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

export function getTableCreateScript(client, table) {
  return new Promise((resolve, reject) => {
    // Reference http://stackoverflow.com/a/32885178
    const sql = `
    SELECT
      'CREATE TABLE ' || table_name || E' (\n' ||
      array_to_string(
        array_agg(
          '  ' || column_name || ' ' ||  type || ' '|| not_null
        )
        , E',\n'
      ) || E'\n);' AS createtable
    FROM
    ( SELECT
        c.relname AS table_name,
        a.attname AS column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
        CASE
          WHEN a.attnotnull THEN 'NOT NULL'
        ELSE 'NULL'
        END AS not_null
      FROM pg_class c,
       pg_attribute a,
       pg_type t
      WHERE c.relname = $1
      AND a.attnum > 0
      AND a.attrelid = c.oid
      AND a.atttypid = t.oid
      ORDER BY a.attnum
    ) AS tabdef
    GROUP BY table_name;
    `;
    const params = [
      table,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map(row => row.createtable));
    });
  });
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
