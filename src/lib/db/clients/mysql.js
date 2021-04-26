// Copyright (c) 2015 The SQLECTRON Team
import rawLog from 'electron-log';
import { readFileSync } from 'fs';
import knexlib from 'knex';
import _ from 'lodash';
import mysql from 'mysql2';
import { identify } from 'sql-query-identifier';
import { createCancelablePromise } from '../../../common/utils';
import { errors } from '../../errors';
import { buildDeleteQueries, buildInsertQueries, buildSelectTopQuery } from './utils';

const log = rawLog.scope('mysql')
const logger = () => log

const knex = knexlib({ client: 'mysql2' })

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
    supportedFeatures: () => ({ customRoutines: true }),
    wrapIdentifier,
    disconnect: () => disconnect(conn),
    listTables: () => listTables(conn),
    listViews: () => listViews(conn),
    listMaterializedViews: () => Promise.resolve([]),
    listRoutines: () => listRoutines(conn),
    listTableColumns: (db, table) => listTableColumns(conn, db, table),
    listTableTriggers: (table) => listTableTriggers(conn, table),
    listTableIndexes: (db, table) => listTableIndexes(conn, db, table),
    listSchemas: () => listSchemas(conn),
    getTableReferences: (table) => getTableReferences(conn, table),
    getPrimaryKey: (db, table) => getPrimaryKey(conn, db, table),
    getTableKeys: (db, table) => getTableKeys(conn, db, table),
    query: (queryText) => query(conn, queryText),
    applyChanges: (changes) => applyChanges(conn, changes),
    executeQuery: (queryText) => executeQuery(conn, queryText),
    listDatabases: (filter) => listDatabases(conn, filter),
    selectTop: (table, offset, limit, orderBy, filters) => selectTop(conn, table, offset, limit, orderBy, filters),
    getQuerySelectTop: (table, limit) => getQuerySelectTop(conn, table, limit),
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

  const routinesSQL = `
    select 
      r.specific_name as specific_name,
      r.routine_name as routine_name,
      r.routine_type as routine_type,
      r.data_type as data_type,
      r.character_maximum_length as length
    from information_schema.routines r
    where r.routine_schema not in ('sys', 'information_schema',
                               'mysql', 'performance_schema')
    and r.routine_schema = database()
    order by r.specific_name
  `

  const paramsSQL = `
select 
       r.routine_schema as routine_schema,
       r.specific_name as specific_name,
       p.parameter_name as parameter_name,
       p.character_maximum_length as char_length,
       p.data_type as data_type
from information_schema.routines r
left join information_schema.parameters p
          on p.specific_schema = r.routine_schema
          and p.specific_name = r.specific_name
where r.routine_schema not in ('sys', 'information_schema',
                               'mysql', 'performance_schema')
    AND p.parameter_mode is not null
    and r.routine_schema = database()
order by r.routine_schema,
         r.specific_name,
         p.ordinal_position;

  `;

  // this gives one row by parameter, so have to do a grouping
  const routinesResult = await driverExecuteQuery(conn, { query: routinesSQL })
  const paramsResult = await driverExecuteQuery(conn, { query: paramsSQL })

    
  const grouped = _.groupBy(paramsResult.data, 'specific_name')

  return routinesResult.data.map((r) => {
    const params = grouped[r.specific_name] || []
    return {
      id: r.specific_name,
      name: r.specific_name,
      returnType: r.data_type,
      returnTypeLength: r.length || undefined,
      type: r.routine_type ? r.routine_type.toLowerCase() : 'function',
      routineParams: params.map((p) => {
        return {
          name: p.parameter_name,
          type: p.data_type,
          length: p.char_length || undefined
        }
      })

    }
  })
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

  const queries = buildSelectTopQuery(table, offset, limit, orderBy, filters)
  let title = 'total'
  if(!filters) {
    // Note: We don't use wrapIdentifier here because it's a string, not an identifier.
    queries.countQuery = `show table status like '${table}'`;
    title = 'Rows'
  }

  const { query, countQuery, params } = queries
  const countResults = await driverExecuteQuery(conn, { query: countQuery, params })
  const result = await driverExecuteQuery(conn, { query, params })
  const rowWithTotal = countResults.data.find((row) => { return row[title] })
  const totalRecords = rowWithTotal ? rowWithTotal[title] : 0
  return {
    result: result.data,
    totalRecords: Number(totalRecords),
    fields: Object.keys(result.data[0] || {})
  }  

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
  const sql = `SHOW KEYS FROM ?? WHERE Key_name = 'PRIMARY'`
  const params = [
    table,
  ];
  const { data } = await driverExecuteQuery(conn, { query: sql, params })
  if (data.length !== 1) return null
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
            executeQuery(connClient, queryText, true),
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

export async function applyChanges(conn, changes) {
  let results = []
  
  await runWithConnection(conn, async (connection) => {
    const cli = { connection }
    await driverExecuteQuery(cli, { query: 'START TRANSACTION'})
    
    try {
      if (changes.inserts) {
        await insertRows(cli, changes.inserts)
      }

      if (changes.updates) {
        results = await updateValues(cli, changes.updates)
      }
  
      if (changes.deletes) {
        await deleteRows(cli, changes.deletes)
      }
  
      await driverExecuteQuery(cli, { query: 'COMMIT'})
    } catch (ex) {
      logger().error("query exception: ", ex)
      await driverExecuteQuery(cli, { query: 'ROLLBACK' });
      throw ex
    }
  })

  return results
}

export async function insertRows(cli, inserts) {

  for (const command of buildInsertQueries(knex, inserts)) {
    await driverExecuteQuery(cli, { query: command })
  }

  return true
}

export async function updateValues(cli, updates) {
  const commands = updates.map(update => {
    let value = update.value
    if (update.columnType && update.columnType === 'bit(1)') {
      value = _.toNumber(update.value)
    } else if (update.columnType && update.columnType.startsWith('bit(')) {
      // value looks like this: b'00000001'
      value = parseInt(update.value.split("'")[1], 2)
    }
    return {
      query: `UPDATE ${wrapIdentifier(update.table)} SET ${wrapIdentifier(update.column)} = ? WHERE ${wrapIdentifier(update.pkColumn)} = ?`,
      params: [value, update.primaryKey]
    }
  })

  const results = []
  // TODO: this should probably return the updated values
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

  return results
}

export async function deleteRows(cli, deletes) {

  for (const command of buildDeleteQueries(knex, deletes)) {
    await driverExecuteQuery(cli, { query: command })
  }

  return true
}

export async function executeQuery(conn, queryText, rowsAsArray = false) {
  const { fields, data } = await driverExecuteQuery(conn, { query: queryText, params: {}, rowsAsArray });
  if (!data) {
    return [];
  }

  const commands = identifyCommands(queryText).map((item) => item.type);

  if (!isMultipleQuery(fields)) {
    return [parseRowQueryResult(data, fields, commands[0], rowsAsArray)];
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
    }

    if (server.config.sslCaFile) {
      config.ssl.ca = readFileSync(server.config.sslCaFile);
    }

    if (server.config.sslCertFile) {
      config.ssl.cert = readFileSync(server.config.sslCertFile);
    }

    if (server.config.sslKeyFile) {
      config.ssl.key = readFileSync(server.config.sslKeyFile);
    }
    if (!config.ssl.key && !config.ssl.ca && !config.ssl.cert) {
      // TODO: provide this as an option in settings
      // or per-connection as 'reject self-signed certs'
      // How it works:
      // if false, cert can be self-signed
      // if true, has to be from a public CA
      // Heroku certs are self-signed.
      // if you provide ca/cert/key files, it overrides this
      config.ssl.rejectUnauthorized = false
    } else {
      config.ssl.rejectUnauthorized = server.config.sslRejectUnauthorized
    }
  }

  return config;
}


function getRealError(conn, err) {
  /* eslint no-underscore-dangle:0 */
  if (conn && conn._protocol && conn._protocol._fatalError) {
    logger().warn("Query error", err, conn._protocol._fatalError)
    return conn._protocol._fatalError;
  }
  return err;
}

function parseFields(fields, rowsAsArray) {
  if (!fields) return []
  return fields.map((field, idx) => {
      return { id: rowsAsArray ? `c${idx}` : field.name, ...field }
    })
}


function parseRowQueryResult(data, rawFields, command, rowsAsArray = false) {
  // Fallback in case the identifier could not reconize the command
  const fields = parseFields(rawFields, rowsAsArray) 
  const fieldIds = fields.map(f => f.id)
  const isSelect = Array.isArray(data);
  return {
    command: command || (isSelect && 'SELECT'),
    rows: isSelect ? data.map(r => rowsAsArray ? _.zipObject(fieldIds, r) : r) : [],
    fields: fields,
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
    connection.query({ sql: queryArgs.query, values: queryArgs.params, rowsAsArray: queryArgs.rowsAsArray }, (err, data, fields) => {
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


export const testOnly = {
  parseFields
}
