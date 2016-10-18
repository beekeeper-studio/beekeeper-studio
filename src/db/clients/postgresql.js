import pg, { Client } from 'pg';
import { identify } from 'sql-query-identifier';

import createDebug from '../../debug';

const debug = createDebug('db:clients:postgresql');


/**
 * Do not convert DATE types to JS date.
 * It gnores of applying a wrong timezone to the date.
 * TODO: do not convert as well these same types with array (types 1115, 1182, 1185)
 */
pg.types.setTypeParser(1082, 'text', (val) => val); // date
pg.types.setTypeParser(1114, 'text', (val) => val); // timestamp without timezone
pg.types.setTypeParser(1184, 'text', (val) => val); // timestamp


export default function (server, database) {
  return new Promise(async (resolve, reject) => {
    const dbConfig = configDatabase(server, database);

    debug('creating database client %j', dbConfig);
    const client = new Client(dbConfig);

    debug('connecting');
    client.connect(async (err) => {
      if (err) {
        client.end();
        return reject(err);
      }

      debug('connected');
      const defaultSchema = await getSchema(client);

      resolve({
        /* eslint max-len:0 */
        wrapIdentifier,
        disconnect: () => disconnect(client),
        listTables: (_, schema = defaultSchema) => listTables(client, schema),
        listViews: (schema = defaultSchema) => listViews(client, schema),
        listRoutines: (schema = defaultSchema) => listRoutines(client, schema),
        listTableColumns: (db, table, schema = defaultSchema) => listTableColumns(client, db, table, schema),
        listTableTriggers: (table, schema = defaultSchema) => listTableTriggers(client, table, schema),
        listSchemas: () => listSchemas(client),
        getTableReferences: (table, schema = defaultSchema) => getTableReferences(client, table, schema),
        getTableKeys: (db, table, schema = defaultSchema) => getTableKeys(client, db, table, schema),
        executeQuery: (query, schema = defaultSchema) => executeQuery(client, query, schema),
        listDatabases: () => listDatabases(client),
        getQuerySelectTop: (table, limit, schema = defaultSchema) => getQuerySelectTop(client, table, limit, schema),
        getTableCreateScript: (table, schema = defaultSchema) => getTableCreateScript(client, table, schema),
        getViewCreateScript: (view, schema = defaultSchema) => getViewCreateScript(client, view, schema),
        getRoutineCreateScript: (routine, type, schema = defaultSchema) => getRoutineCreateScript(client, routine, type, schema),
        truncateAllTables: (_, schema = defaultSchema) => truncateAllTables(client, schema),
      });
    });
  });
}


export function disconnect(client) {
  client.end();
}


export function listTables(client, schema) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      AND table_type NOT LIKE '%VIEW%'
      ORDER BY table_name
    `;
    const params = [
      schema,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => row.table_name));
    });
  });
}

export function listViews(client, schema) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = $1
      ORDER BY table_name
    `;
    const params = [
      schema,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => row.table_name));
    });
  });
}

export function listRoutines(client, schema) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = $1
      ORDER BY routine_name
    `;
    const params = [
      schema,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => ({
        routineName: row.routine_name,
        routineType: row.routine_type,
      })));
    });
  });
}

export function listTableColumns(client, database, table, schema) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = $1
      AND table_name = $2
    `;
    const params = [
      schema,
      table,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => ({
        columnName: row.column_name,
        dataType: row.data_type,
      })));
    });
  });
}

export function listTableTriggers(client, table, schema) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_schema = $1
      AND event_object_table = $2
    `;
    const params = [
      schema,
      table,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => row.trigger_name));
    });
  });
}

export function listSchemas(client) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name <> 'information_schema' -- exclude 'system' schemata
      AND schema_name !~ E'^pg_'                -- exclude more 'system' (pg-specific)
    `;

    client.query(sql, [], (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => row.schema_name));
    });
  });
}

export function getTableReferences(client, table, schema) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT ctu.table_name AS referenced_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.constraint_table_usage AS ctu
      ON ctu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
      AND tc.table_schema = $2
    `;
    const params = [
      table,
      schema,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => row.referenced_table_name));
    });
  });
}

export function getTableKeys(client, database, table, schema) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        CASE WHEN tc.constraint_type LIKE '%FOREIGN%' THEN ctu.table_name
        ELSE NULL
        END AS referenced_table_name,
        tc.constraint_type
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        USING (constraint_schema, constraint_name)
      JOIN information_schema.constraint_table_usage as ctu
        USING (constraint_schema, constraint_name)
      WHERE tc.table_name = $1
      AND tc.table_schema = $2
      AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
    `;
    const params = [
      table,
      schema,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => ({
        constraintName: row.constraint_name,
        columnName: row.column_name,
        referencedTable: row.referenced_table_name,
        keyType: row.constraint_type,
      })));
    });
  });
}

export function executeQuery(client, query) {
  const commands = identifyCommands(query);

  // node-postgres has support for Promise query
  // but that always returns the "fields" property empty
  return new Promise((resolve, reject) => {
    client.query({ text: query, multiResult: true }, (err, data) => {
      if (err) return reject(err);

      resolve(data.map((result, idx) => parseRowQueryResult(result, commands[idx])));
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
    const params = [false];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => row.datname));
    });
  });
}


export function getQuerySelectTop(client, table, limit, schema) {
  return `SELECT * FROM ${wrapIdentifier(schema)}.${wrapIdentifier(table)} LIMIT ${limit}`;
}

export function getTableCreateScript(client, table, schema) {
  return new Promise((resolve, reject) => {
    // Reference http://stackoverflow.com/a/32885178
    const sql = `
    SELECT
      'CREATE TABLE ' || quote_ident(tabdef.schema_name) || '.' || quote_ident(tabdef.table_name) || E' (\n' ||
      array_to_string(
        array_agg(
          '  ' || quote_ident(tabdef.column_name) || ' ' ||  tabdef.type || ' '|| tabdef.not_null
        )
        , E',\n'
      ) || E'\n);\n' ||
      CASE WHEN tc.constraint_name IS NULL THEN ''
           ELSE E'\nALTER TABLE ' || quote_ident($2) || '.' || quote_ident(tabdef.table_name) ||
           ' ADD CONSTRAINT ' || quote_ident(tc.constraint_name)  ||
           ' PRIMARY KEY ' || '(' || substring(constr.column_name from 0 for char_length(constr.column_name)-1) || ')'
      END AS createtable
    FROM
    ( SELECT
        c.relname AS table_name,
        a.attname AS column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
        CASE
          WHEN a.attnotnull THEN 'NOT NULL'
        ELSE 'NULL'
        END AS not_null,
        n.nspname as schema_name
      FROM pg_class c,
       pg_attribute a,
       pg_type t,
       pg_namespace n
      WHERE c.relname = $1
      AND a.attnum > 0
      AND a.attrelid = c.oid
      AND a.atttypid = t.oid
      AND n.oid = c.relnamespace
      AND n.nspname = $2
      ORDER BY a.attnum DESC
    ) AS tabdef
    LEFT JOIN information_schema.table_constraints tc
    ON  tc.table_name       = tabdef.table_name
    AND tc.table_schema     = tabdef.schema_name
    AND tc.constraint_Type  = 'PRIMARY KEY'
    LEFT JOIN LATERAL (
      SELECT column_name || ', ' AS column_name
      FROM   information_schema.key_column_usage kcu
      WHERE  kcu.constraint_name = tc.constraint_name
      AND kcu.table_name = tabdef.table_name
      AND kcu.table_schema = tabdef.schema_name
      ORDER BY ordinal_position
    ) AS constr ON true
    GROUP BY tabdef.schema_name, tabdef.table_name, tc.constraint_name, constr.column_name;
    `;
    const params = [
      table,
      schema,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => row.createtable));
    });
  });
}

export function getViewCreateScript(client, view, schema) {
  return new Promise((resolve, reject) => {
    const createViewSql = `CREATE OR REPLACE VIEW ${wrapIdentifier(schema)}.${view} AS`;
    const sql = 'SELECT pg_get_viewdef($1::regclass, true)';
    const params = [view];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => `${createViewSql}\n${row.pg_get_viewdef}`));
    });
  });
}

export function getRoutineCreateScript(client, routine, _, schema) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT pg_get_functiondef(p.oid)
      FROM pg_proc p
      LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE proname = $1
      AND n.nspname = $2
    `;
    const params = [
      routine,
      schema,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => row.pg_get_functiondef));
    });
  });
}

export function wrapIdentifier(value) {
  if (value === '*') return value;
  const matched = value.match(/(.*?)(\[[0-9]\])/);
  if (matched) return wrapIdentifier(matched[1]) + matched[2];
  return `"${value.replace(/"/g, '""')}"`;
}


const getSchema = async (connection) => {
  const [result] = await executeQuery(connection, 'SELECT current_schema() AS schema');
  return result.rows[0].schema;
};

export const truncateAllTables = async (connection, schema) => new Promise((resolve, reject) => {
  const sql = `
    SELECT quote_ident(table_name) as table_name
    FROM information_schema.tables
    WHERE table_schema = $1
    AND table_type NOT LIKE '%VIEW%'
  `;
  const params = [
    schema,
  ];

  connection.query(sql, params, (err, data) => {
    if (err) return reject(err);
    const tables = data.rows.map((row) => row.table_name);
    const promises = tables.map((t) => {
      const truncateSQL = `
        TRUNCATE TABLE ${wrapIdentifier(schema)}.${wrapIdentifier(t)}
        RESTART IDENTITY CASCADE;
      `;
      return executeQuery(connection, truncateSQL);
    });
    Promise.all(promises).then((alldata) => resolve(alldata));
  });
});

function configDatabase(server, database) {
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

  if (server.config.ssl) {
    config.ssl = server.config.ssl;
  }

  return config;
}


function parseRowQueryResult(data, command) {
  const isSelect = data.command === 'SELECT';
  return {
    command: command || data.command,
    rows: data.rows,
    fields: data.fields,
    rowCount: isSelect ? data.rowCount : undefined,
    affectedRows: !isSelect && !isNaN(data.rowCount) ? data.rowCount : undefined,
  };
}


function identifyCommands(query) {
  try {
    return identify(query);
  } catch (err) {
    return [];
  }
}
