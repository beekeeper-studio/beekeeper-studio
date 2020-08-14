// Copyright (c) 2015 The SQLECTRON Team

import mysql from 'mysql2';
import { identify } from 'sql-query-identifier';

import createLogger from '../../logger';
import { createCancelablePromise } from '../../../common/utils';
import errors from '../../errors';
import { genericSelectTop } from './utils';

const logger = createLogger('db:clients:mysql');

const mysqlErrors = {
  EMPTY_QUERY: 'ER_EMPTY_QUERY',
  CONNECTION_LOST: 'PROTOCOL_CONNECTION_LOST',
};

export default async function (server, database) {
  const dbConfig = configDatabase(server, database);
  logger().debug('create driver client for mysql with config %j', dbConfig);

  const conn = {
    pool: mysql.createPool(dbConfig),
  };

  // light solution to test connection with with the server
  await driverExecuteQuery(conn, { query: 'select version();' });

  return {
    wrapIdentifier,
    disconnect: () => disconnect(conn),
    listTables: () => listTables(conn),
    listViews: () => listViews(conn),
    listMaterializedViews: () => [],
    listRoutines: () => listRoutines(conn),
    listTableColumns: (db, table) => listTableColumns(conn, db, table),
    listTableTriggers: (table) => listTableTriggers(conn, table),
    listTableIndexes: (db, table) => listTableIndexes(conn, db, table),
    listSchemas: () => listSchemas(conn),
    getTableReferences: (table) => getTableReferences(conn, table),
    getPrimaryKey: (db, table) => getPrimaryKey(conn, db, table),
    getTableKeys: (db, table) => getTableKeys(conn, db, table),
    query: (queryText) => query(conn, queryText),
    updateValues: (updates) => updateValues(conn, updates),
    executeQuery: (queryText) => executeQuery(conn, queryText),
    listDatabases: (filter) => listDatabases(conn, filter),
    selectTop: (table, offset, limit, orderBy, filters) => selectTop(conn, table, offset, limit, orderBy, filters),
    w: (table, limit) => getQuerySelectTop(conn, table, limit),
    getTableCreateScript: (table) => getTableCreateScript(conn, table),
    getViewCreateScript: (view) => getViewCreateScript(conn, view),
    getRoutineCreateScript: (routine, type) => getRoutineCreateScript(conn, routine, type),
    truncateAllTables: () => truncateAllTables(conn),
  };
}


export function disconnect(conn) {
  conn.pool.end();
}


export async function listTables(conn) {
  const sql = `
    SELECT table_name as name
    FROM information_schema.tables
    WHERE table_schema = database()
    AND table_type NOT LIKE '%VIEW%'
    ORDER BY table_name
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data;
}

export async function listViews(conn) {
  const sql = `
    SELECT table_name as name
    FROM information_schema.views
    WHERE table_schema = database()
    ORDER BY table_name
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data;
}

export async function listRoutines(conn) {
  const sql = `
    SELECT routine_name as 'routine_name', routine_type as 'routine_type'
    FROM information_schema.routines
    WHERE routine_schema = database()
    ORDER BY routine_name
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => ({
    routineName: row.routine_name,
    routineType: row.routine_type,
  }));
}

export async function listTableColumns(conn, database, table) {
  const clause = table ? `AND table_name = ?` : ''
  const sql = `
    SELECT table_name AS 'table_name', column_name AS 'column_name', column_type AS 'data_type'
    FROM information_schema.columns
    WHERE table_schema = database()
    ${clause}
    ORDER BY ordinal_position
  `;

  const params = table ? [table] : []

  const { data } = await driverExecuteQuery(conn, { query: sql, params });

  return data.map((row) => ({
    tableName: row.table_name,
    columnName: row.column_name,
    dataType: row.data_type,
  }));
}

export async function selectTop(conn, table, offset, limit, orderBy, filters) {
  return genericSelectTop(conn, table, offset, limit, orderBy, filters, driverExecuteQuery)
}

export async function listTableTriggers(conn, table) {
  const sql = `
    SELECT trigger_name as 'trigger_name'
    FROM information_schema.triggers
    WHERE event_object_schema = database()
    AND event_object_table = ?
  `;

  const params = [
    table,
  ];

  const { data } = await driverExecuteQuery(conn, { query: sql, params });

  return data.map((row) => row.trigger_name);
}

export async function listTableIndexes(conn, database, table) {
  const sql = 'SHOW INDEX FROM ?? FROM ??';

  const params = [
    table,
    database,
  ];

  const { data } = await driverExecuteQuery(conn, { query: sql, params });

  return data.map((row) => row.Key_name);
}

export function listSchemas() {
  return Promise.resolve([]);
}

export async function getTableReferences(conn, table) {
  const sql = `
    SELECT referenced_table_name as 'referenced_table_name'
    FROM information_schema.key_column_usage
    WHERE referenced_table_name IS NOT NULL
    AND table_schema = database()
    AND table_name = ?
  `;

  const params = [
    table,
  ];

  const { data } = await driverExecuteQuery(conn, { query: sql, params });

  return data.map((row) => row.referenced_table_name);
}

export async function getPrimaryKey(conn, database, table) {
  logger().debug('finding foreign key for', database, table)
  const sql = `SHOW KEYS FROM ${table} WHERE Key_name = 'PRIMARY'`
  const { data } = await driverExecuteQuery(conn, { query: sql })
  return data[0] ? data[0].Column_name : null
}

export async function getTableKeys(conn, database, table) {
  const sql = `
    SELECT constraint_name as 'constraint_name', column_name as 'column_name', referenced_table_name as 'referenced_table_name',
      IF(referenced_table_name IS NOT NULL, 'FOREIGN', constraint_name) as key_type,
      REFERENCED_TABLE_NAME as referenced_table,
      REFERENCED_COLUMN_NAME as referenced_column
    FROM information_schema.key_column_usage
    WHERE table_schema = database()
    AND table_name = ?
    AND referenced_table_name IS NOT NULL
  `;

  const params = [
    table,
  ];

  const { data } = await driverExecuteQuery(conn, { query: sql, params });

  return data.map((row) => ({
    constraintName: `${row.constraint_name} KEY`,
    toTable: row.referenced_table,
    toColumn: row.referenced_column,
    fromTable: table,
    fromColumn: row.column_name,
    referencedTable: row.referenced_table_name,
    keyType: `${row.key_type} KEY`,
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

        const { data: dataPid } = await driverExecuteQuery(connClient, {
          query: 'SELECT connection_id() AS pid',
        });

        pid = dataPid[0].pid;

        try {
          const data = await Promise.race([
            cancelable.wait(),
            executeQuery(connClient, queryText),
          ]);

          pid = null;

          return data;
        } catch (err) {
          if (canceling && err.code === mysqlErrors.CONNECTION_LOST) {
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
        await driverExecuteQuery(conn, {
          query: `kill ${pid};`,
        });
        cancelable.cancel();
      } catch (err) {
        canceling = false;
        throw err;
      }
    },
  };
}

export async function updateValues(conn, updates) {
  const updateCommands = updates.map(update => {
    return {
      query: `UPDATE ${wrapIdentifier(update.table)} SET ${wrapIdentifier(update.column)} = ? WHERE ${wrapIdentifier(update.pkColumn)} = ?`,
      params: [update.value, update.primaryKey]
    }
  })

  const commands = [{ query: 'START TRANSACTION'}, ...updateCommands];
  const results = []
  // TODO: this should probably return the updated values
  await runWithConnection(conn, async (connection) => {
    const cli = { connection }
    try {
      for (let index = 0; index < commands.length; index++) {
        const blob = commands[index];
        await driverExecuteQuery(cli, blob)
      }

      const returnQueries = updates.map(update => {
        return {
          query: `select * from ${wrapIdentifier(update.table)} where ${wrapIdentifier(update.pkColumn)} = ?`,
          params: [
            update.primaryKey
          ]
        }
      })

      for (let index = 0; index < returnQueries.length; index++) {
        const blob = returnQueries[index];
        const r = await driverExecuteQuery(cli, blob)
        if (r.data[0]) results.push(r.data[0])
      }
      await driverExecuteQuery(cli,{ query: 'COMMIT'})
    } catch (ex) {
      logger().error("query exception: ", ex)
      await driverExecuteQuery(cli, { query: 'ROLLBACK' });

      throw ex
    }
  })
  return results
}


export async function executeQuery(conn, queryText) {
  const { fields, data } = await driverExecuteQuery(conn, { query: queryText });
  if (!data) {
    return [];
  }

  const commands = identifyCommands(queryText).map((item) => item.type);

  if (!isMultipleQuery(fields)) {
    return [parseRowQueryResult(data, fields, commands[0])];
  }

  return data.map((_, idx) => parseRowQueryResult(data[idx], fields[idx], commands[idx]));
}


export async function listDatabases(conn, filter) {
  const sql = 'show databases';

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data
    .filter((item) => filterDatabase(item, filter, 'Database'))
    .map((row) => row.Database);
}


export function getQuerySelectTop(conn, table, limit) {
  return `SELECT * FROM ${wrapIdentifier(table)} LIMIT ${limit}`;
}

export async function getTableCreateScript(conn, table) {
  const sql = `SHOW CREATE TABLE ${table}`;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => row['Create Table']);
}

export async function getViewCreateScript(conn, view) {
  const sql = `SHOW CREATE VIEW ${view}`;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => row['Create View']);
}

export async function getRoutineCreateScript(conn, routine, type) {
  const sql = `SHOW CREATE ${type.toUpperCase()} ${routine}`;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => row[`Create ${type}`]);
}

export function wrapIdentifier(value) {
  return (value !== '*' ? `\`${value.replace(/`/g, '``')}\`` : '*');
}

async function getSchema(conn) {
  const sql = 'SELECT database() AS \'schema\'';

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data[0].schema;
}

export async function truncateAllTables(conn) {
  await runWithConnection(conn, async (connection) => {
    const connClient = { connection };

    const schema = await getSchema(connClient);

    const sql = `
      SELECT table_name as 'table_name'
      FROM information_schema.tables
      WHERE table_schema = '${schema}'
      AND table_type NOT LIKE '%VIEW%'
    `;

    const { data } = await driverExecuteQuery(connClient, { query: sql });

    const truncateAll = data.map((row) => `
      SET FOREIGN_KEY_CHECKS = 0;
      TRUNCATE TABLE ${wrapIdentifier(schema)}.${wrapIdentifier(row.table_name)};
      SET FOREIGN_KEY_CHECKS = 1;
    `).join('');

    await driverExecuteQuery(connClient, { query: truncateAll });
  });
}


function configDatabase(server, database) {
  const config = {
    host: server.config.host,
    port: server.config.port,
    user: server.config.user,
    password: server.config.password,
    database: database.database,
    multipleStatements: true,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    connectTimeout  : 60 * 60 * 1000,
  };

  if (server.sshTunnel) {
    config.host = server.config.localHost;
    config.port = server.config.localPort;
  }

  if (server.config.ssl) {
    config.ssl = {
      // It is not the best recommend way to use SSL with node-mysql
      // https://github.com/felixge/node-mysql#ssl-options
      // But this way we have compatibility with all clients.
      rejectUnauthorized: false,
    };
  }

  return config;
}


function getRealError(conn, err) {
  /* eslint no-underscore-dangle:0 */
  if (conn && conn._protocol && conn._protocol._fatalError) {
    return conn._protocol._fatalError;
  }
  return err;
}


function parseRowQueryResult(data, fields, command) {
  // Fallback in case the identifier could not reconize the command
  const isSelect = Array.isArray(data);
  return {
    command: command || (isSelect && 'SELECT'),
    rows: isSelect ? data : [],
    fields: fields || [],
    rowCount: isSelect ? (data || []).length : undefined,
    affectedRows: !isSelect ? data.affectedRows : undefined,
  };
}


function isMultipleQuery(fields) {
  if (!fields) { return false; }
  if (!fields.length) { return false; }
  return (Array.isArray(fields[0]) || fields[0] === undefined);
}


function identifyCommands(queryText) {
  try {
    return identify(queryText);
  } catch (err) {
    return [];
  }
}

function driverExecuteQuery(conn, queryArgs) {
  logger().debug(`Running Query ${queryArgs.query}`)
  const runQuery = (connection) => new Promise((resolve, reject) => {
    connection.query(queryArgs.query, queryArgs.params, (err, data, fields) => {
      logger().debug(`Resolving Query ${queryArgs.query}`)
      if (err && err.code === mysqlErrors.EMPTY_QUERY) return resolve({});
      if (err) return reject(getRealError(connection, err));

      resolve({ data, fields });
    });
  });

  return conn.connection
    ? runQuery(conn.connection)
    : runWithConnection(conn, runQuery);
}

async function runWithConnection({ pool }, run) {
  let rejected = false;
  return new Promise((resolve, reject) => {
    const rejectErr = (err) => {
      if (!rejected) {
        rejected = true;
        reject(err);
      }
    };

    pool.getConnection(async (errPool, connection) => {
      if (errPool) {
        rejectErr(errPool);
        return;
      }

      connection.on('error', (error) => {
        // it will be handled later in the next query execution
        logger().error('Connection fatal error %j', error);
      });

      try {
        resolve(await run(connection));
      } catch (err) {
        rejectErr(err);
      } finally {
        connection.release();
      }
    });
  });
}

export function filterDatabase(item, { database } = {}, databaseField) {
  if (!database) { return true; }

  const value = item[databaseField];
  if (typeof database === 'string') {
    return database === value;
  }

  const { only, ignore } = database;

  if (only && only.length && !~only.indexOf(value)) {
    return false;
  }

  if (ignore && ignore.length && ~ignore.indexOf(value)) {
    return false;
  }

  return true;
}
