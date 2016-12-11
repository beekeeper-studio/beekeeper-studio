import pg from 'pg';
import { identify } from 'sql-query-identifier';

import createDebug from '../../debug';
import { createCancelablePromise } from '../../utils';
import errors from '../../errors';

const debug = createDebug('db:clients:postgresql');

const pgErrors = {
  CANCELED: '57014',
};

/**
 * Do not convert DATE types to JS date.
 * It gnores of applying a wrong timezone to the date.
 * TODO: do not convert as well these same types with array (types 1115, 1182, 1185)
 */
pg.types.setTypeParser(1082, 'text', (val) => val); // date
pg.types.setTypeParser(1114, 'text', (val) => val); // timestamp without timezone
pg.types.setTypeParser(1184, 'text', (val) => val); // timestamp


export default async function (server, database) {
  const dbConfig = configDatabase(server, database);
  debug('create driver client fro postgres with config %j', dbConfig);

  const conn = {
    pool: new pg.Pool(dbConfig),
  };

  debug('connected');
  const defaultSchema = await getSchema(conn);

  return {
    /* eslint max-len:0 */
    wrapIdentifier,
    disconnect: () => disconnect(conn),
    listTables: (_, schema = defaultSchema) => listTables(conn, schema),
    listViews: (schema = defaultSchema) => listViews(conn, schema),
    listRoutines: (schema = defaultSchema) => listRoutines(conn, schema),
    listTableColumns: (db, table, schema = defaultSchema) => listTableColumns(conn, db, table, schema),
    listTableTriggers: (table, schema = defaultSchema) => listTableTriggers(conn, table, schema),
    listTableIndexes: (db, table, schema = defaultSchema) => listTableIndexes(conn, table, schema),
    listSchemas: () => listSchemas(conn),
    getTableReferences: (table, schema = defaultSchema) => getTableReferences(conn, table, schema),
    getTableKeys: (db, table, schema = defaultSchema) => getTableKeys(conn, db, table, schema),
    query: (queryText, schema = defaultSchema) => query(conn, queryText, schema),
    executeQuery: (queryText, schema = defaultSchema) => executeQuery(conn, queryText, schema),
    listDatabases: () => listDatabases(conn),
    getQuerySelectTop: (table, limit, schema = defaultSchema) => getQuerySelectTop(conn, table, limit, schema),
    getTableCreateScript: (table, schema = defaultSchema) => getTableCreateScript(conn, table, schema),
    getViewCreateScript: (view, schema = defaultSchema) => getViewCreateScript(conn, view, schema),
    getRoutineCreateScript: (routine, type, schema = defaultSchema) => getRoutineCreateScript(conn, routine, type, schema),
    truncateAllTables: (_, schema = defaultSchema) => truncateAllTables(conn, schema),
  };
}


export function disconnect(conn) {
  conn.pool.end();
}


export async function listTables(conn, schema) {
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

  const data = await driverExecuteQuery(conn, { query: sql, params });

  return data.rows.map((row) => row.table_name);
}

export async function listViews(conn, schema) {
  const sql = `
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = $1
    ORDER BY table_name
  `;

  const params = [
    schema,
  ];

  const data = await driverExecuteQuery(conn, { query: sql, params });

  return data.rows.map((row) => row.table_name);
}

export async function listRoutines(conn, schema) {
  const sql = `
    SELECT routine_name, routine_type
    FROM information_schema.routines
    WHERE routine_schema = $1
    ORDER BY routine_name
  `;

  const params = [
    schema,
  ];

  const data = await driverExecuteQuery(conn, { query: sql, params });

  return data.rows.map((row) => ({
    routineName: row.routine_name,
    routineType: row.routine_type,
  }));
}

export async function listTableColumns(conn, database, table, schema) {
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

  const data = await driverExecuteQuery(conn, { query: sql, params });

  return data.rows.map((row) => ({
    columnName: row.column_name,
    dataType: row.data_type,
  }));
}

export async function listTableTriggers(conn, table, schema) {
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

  const data = await driverExecuteQuery(conn, { query: sql, params });

  return data.rows.map((row) => row.trigger_name);
}
export async function listTableIndexes(conn, table, schema) {
  const sql = `
    SELECT indexname as index_name
    FROM pg_indexes
    WHERE schemaname = $1
    AND tablename = $2
  `;

  const params = [
    schema,
    table,
  ];

  const data = await driverExecuteQuery(conn, { query: sql, params });

  return data.rows.map((row) => row.index_name);
}

export async function listSchemas(conn) {
  const sql = `
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name <> 'information_schema' -- exclude 'system' schemata
    AND schema_name !~ E'^pg_'                -- exclude more 'system' (pg-specific)
  `;

  const data = await driverExecuteQuery(conn, { query: sql });

  return data.rows.map((row) => row.schema_name);
}

export async function getTableReferences(conn, table, schema) {
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

  const data = await driverExecuteQuery(conn, { query: sql, params });

  return data.rows.map((row) => row.referenced_table_name);
}

export async function getTableKeys(conn, database, table, schema) {
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

  const data = await driverExecuteQuery(conn, { query: sql, params });

  return data.rows.map((row) => ({
    constraintName: row.constraint_name,
    columnName: row.column_name,
    referencedTable: row.referenced_table_name,
    keyType: row.constraint_type,
  }));
}


export function query(conn, queryText) {
  let pid = null;
  let canceling = false;
  const cancelable = createCancelablePromise({
    ...errors.CANCELED_BY_USER,
    sqlectronError: 'CANCELED_BY_USER',
  });

  return {
    execute() {
      return runWithConnection(conn, async (connection) => {
        const connClient = { connection };

        const dataPid = await driverExecuteQuery(connClient, {
          query: 'SELECT pg_backend_pid() AS pid',
        });

        pid = dataPid.rows[0].pid;

        try {
          const data = await Promise.race([
            cancelable.wait(),
            executeQuery(connClient, queryText),
          ]);

          pid = null;

          return data;
        } catch (err) {
          if (canceling && err.code === pgErrors.CANCELED) {
            canceling = false;
            err.sqlectronError = 'CANCELED_BY_USER';
          }

          throw err;
        } finally {
          cancelable.discard();
        }
      });
    },

    async cancel() {
      if (!pid) {
        throw new Error('Query not ready to be canceled');
      }

      canceling = true;
      try {
        const data = await driverExecuteQuery(conn, {
          query: `SELECT pg_cancel_backend(${pid});`,
        });

        if (!data.rows[0].pg_cancel_backend) {
          throw new Error(`Failed canceling query with pid ${pid}.`);
        }

        cancelable.cancel();
      } catch (err) {
        canceling = false;
        throw err;
      }
    },
  };
}


export async function executeQuery(conn, queryText) {
  const data = await driverExecuteQuery(conn, { query: queryText, multiple: true });

  const commands = identifyCommands(queryText);

  return data.map((result, idx) => parseRowQueryResult(result, commands[idx]));
}


export async function listDatabases(conn) {
  const sql = `
    SELECT datname
    FROM pg_database
    WHERE datistemplate = $1
    ORDER BY datname
  `;

  const params = [false];

  const data = await driverExecuteQuery(conn, { query: sql, params });

  return data.rows.map((row) => row.datname);
}


export function getQuerySelectTop(conn, table, limit, schema) {
  return `SELECT * FROM ${wrapIdentifier(schema)}.${wrapIdentifier(table)} LIMIT ${limit}`;
}

export async function getTableCreateScript(conn, table, schema) {
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

  const data = await driverExecuteQuery(conn, { query: sql, params });

  return data.rows.map((row) => row.createtable);
}

export async function getViewCreateScript(conn, view, schema) {
  const createViewSql = `CREATE OR REPLACE VIEW ${wrapIdentifier(schema)}.${view} AS`;

  const sql = 'SELECT pg_get_viewdef($1::regclass, true)';

  const params = [view];

  const data = await driverExecuteQuery(conn, { query: sql, params });

  return data.rows.map((row) => `${createViewSql}\n${row.pg_get_viewdef}`);
}

export async function getRoutineCreateScript(conn, routine, _, schema) {
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

  const data = await driverExecuteQuery(conn, { query: sql, params });

  return data.rows.map((row) => row.pg_get_functiondef);
}

export function wrapIdentifier(value) {
  if (value === '*') return value;
  const matched = value.match(/(.*?)(\[[0-9]\])/); // eslint-disable-line no-useless-escape
  if (matched) return wrapIdentifier(matched[1]) + matched[2];
  return `"${value.replace(/"/g, '""')}"`;
}


async function getSchema(conn) {
  const sql = 'SELECT current_schema() AS schema';

  const data = await driverExecuteQuery(conn, { query: sql });

  return data.rows[0].schema;
}

export async function truncateAllTables(conn, schema) {
  await runWithConnection(conn, async (connection) => {
    const connClient = { connection };

    const sql = `
      SELECT quote_ident(table_name) as table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      AND table_type NOT LIKE '%VIEW%'
    `;

    const params = [
      schema,
    ];

    const data = await driverExecuteQuery(connClient, { query: sql, params });

    const truncateAll = data.rows.map((row) => `
      TRUNCATE TABLE ${wrapIdentifier(schema)}.${wrapIdentifier(row.table_name)}
      RESTART IDENTITY CASCADE;
    `).join('');

    await driverExecuteQuery(connClient, { query: truncateAll, multiple: true });
  });
}

function configDatabase(server, database) {
  const config = {
    host: server.config.host,
    port: server.config.port,
    user: server.config.user,
    password: server.config.password,
    database: database.database,
    max: 5, // max idle connections per time (30 secs)
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


function identifyCommands(queryText) {
  try {
    return identify(queryText);
  } catch (err) {
    return [];
  }
}

function driverExecuteQuery(conn, queryArgs) {
  const runQuery = (connection) => {
    const args = {
      text: queryArgs.query,
      values: queryArgs.params,
      multiResult: queryArgs.multiple,
    };

    // node-postgres has support for Promise query
    // but that always returns the "fields" property empty
    return new Promise((resolve, reject) => {
      connection.query(args, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
  };

  return conn.connection
    ? runQuery(conn.connection)
    : runWithConnection(conn, runQuery);
}

async function runWithConnection({ pool }, run) {
  const connection = await pool.connect();

  try {
    return await run(connection);
  } finally {
    connection.release();
  }
}
