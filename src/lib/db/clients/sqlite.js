// Copyright (c) 2015 The SQLECTRON Team

import _ from 'lodash'
// import sqlite3 from 'sqlite3';
import Database from 'better-sqlite3'
import { identify } from 'sql-query-identifier';
import knexlib from 'knex'
import rawLog from 'electron-log'
import { buildInsertQueries, buildDeleteQueries, genericSelectTop, buildSelectTopQuery } from './utils';
import { SqliteCursor } from './sqlite/SqliteCursor';
const log = rawLog.scope('sqlite')
const logger = () => log

const knex = knexlib({ client: 'sqlite3'})

const sqliteErrors = {
  CANCELED: 'SQLITE_INTERRUPT',
}; 


export default async function (server, database) {
  const dbConfig = configDatabase(server, database);
  logger().debug('create driver client for sqlite3 with config %j', dbConfig);

  const conn = { dbConfig };

  // light solution to test connection with with the server
  await driverExecuteQuery(conn, { query: 'SELECT sqlite_version()' });

  return {
    supportedFeatures: () => ({ customRoutines: false, comments: false, properties: true }),
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
    getPrimaryKeys: (db, table) => getPrimaryKeys(conn, db, table),
    getTableKeys: (db, table) => getTableKeys(conn, db, table),
    query: (queryText) => query(conn, queryText),
    applyChanges: (changes) => applyChanges(conn, changes),
    executeQuery: (queryText) => executeQuery(conn, queryText),
    listDatabases: () => listDatabases(conn),
    selectTop: (table, offset, limit, orderBy, filters) => selectTop(conn, table, offset, limit, orderBy, filters),
    selectTopStream: (db, table, orderBy, filters, chunkSize) => selectTopStream(conn, db, table, orderBy, filters, chunkSize),
    getQuerySelectTop: (table, limit) => getQuerySelectTop(conn, table, limit),
    getTableCreateScript: (table) => getTableCreateScript(conn, table),
    getViewCreateScript: (view) => getViewCreateScript(conn, view),
    getRoutineCreateScript: (routine) => getRoutineCreateScript(conn, routine),
    truncateAllTables: () => truncateAllTables(conn),
    getTableProperties: (table) => getTableProperties(conn, table)
  };
}


export function disconnect() {
  // SQLite does not have connection poll. So we open and close connections
  // for every query request. This allows multiple request at same time by
  // using a different thread for each connection.
  // This may cause connection limit problem. So we may have to change this at some point.
  return Promise.resolve();
}


export function wrapIdentifier(value) {
  if (value === '*') return value;
  const matched = value.match(/(.*?)(\[[0-9]\])/); // eslint-disable-line no-useless-escape
  if (matched) return wrapIdentifier(matched[1]) + matched[2];
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeString(value) {
  return value.replace("'", "''")
}


export function getQuerySelectTop(client, table, limit) {
  return `SELECT * FROM ${wrapIdentifier(table)} LIMIT ${limit}`;
}

export async function getTableLength(conn, table, filters) {
  const { countQuery, params } = buildSelectTopQuery(table, null, null, null, filters)
  const countResults = await driverExecuteQuery(conn, { query: countQuery, params })
  const rowWithTotal = countResults.data.find((row) => { return row.total })
  const totalRecords = rowWithTotal ? rowWithTotal.total : 0
  return Number(totalRecords)
}

export async function selectTop(conn, table, offset, limit, orderBy, filters) {
  return genericSelectTop(conn, table, offset, limit, orderBy, filters, driverExecuteQuery)

}

export async function selectTopStream(conn, db, table, orderBy, filters, chunkSize) {
  const qs = buildSelectTopQuery(table, null, null, orderBy, filters)
  const columns = await listTableColumns(conn, db, table)
  const rowCount = await getTableLength(conn, table, filters)
  const { query, params } = qs
  return {
    totalRows: rowCount,
    columns,
    cursor: new SqliteCursor(conn, query, params, chunkSize)
  }
}

export function query(conn, queryText) {
  let queryConnection = null;

  return {
    execute() {
      return runWithConnection(conn, async (connection) => {
        try {
          queryConnection = connection;

          const result = await executeQuery({ connection }, queryText);
          return result;
        } catch (err) {
          if (err.code === sqliteErrors.CANCELED) {
            err.sqlectronError = 'CANCELED_BY_USER';
          }

          throw err;
        }
      });
    },

    async cancel() {
      if (!queryConnection) {
        throw new Error('Query not ready to be canceled');
      }

      queryConnection.interrupt();
    },
  };
}

export async function insertRows(cli, inserts) {

    for (const command of buildInsertQueries(knex, inserts)) {
      await driverExecuteQuery(cli, { query: command })
    }

    return true
}

export async function applyChanges(conn, changes) {
  let results = []

  await runWithConnection(conn, async (connection) => {
    const cli = { connection }
    await driverExecuteQuery(cli, { query: 'BEGIN'})

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
      log.error("query exception: ", ex)
      await driverExecuteQuery(cli, { query: 'ROLLBACK' })
      throw ex
    }
  })

  return results
}

export async function updateValues(cli, updates) {
  const commands = updates.map(update => {
    return {
      query: `UPDATE ${update.table} SET ${update.column} = ? WHERE ${update.pkColumn} = ?`,
      params: [update.value, update.primaryKey]
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
      query: `select * from "${update.table}" where "${update.pkColumn}" = ?`,
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

export async function executeQuery(conn, queryText) {
  const result = await driverExecuteQuery(conn, { query: queryText, multiple: true });

  return result.map(parseRowQueryResult);
}


export async function listTables(conn) {
  const sql = `
    SELECT name
    FROM sqlite_master
    WHERE type='table'
    ORDER BY name
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data;
}

export async function listViews(conn) {
  const sql = `
    SELECT name
    FROM sqlite_master
    WHERE type = 'view'
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data;
}

export function listRoutines() {
  return Promise.resolve([]); // DOES NOT SUPPORT IT
}

function dataToColumns(data, tableName) {
  return data.map((row) => ({
    tableName,
    columnName: row.name,
    dataType: row.type,
    nullable: Number(row.notnull || 0) === 0,
    defaultValue: row.dflt_value === 'NULL' ? null : row.dflt_value,
    ordinalPosition: Number(row.cid)
  }))
}

async function listTableColumnsSimple(conn, database, table) {
  const sql = `PRAGMA table_info('${table}')`;

  const { data } = await driverExecuteQuery(conn, { query: sql });
  return dataToColumns(data, table)
}

export async function listTableColumns(conn, database, table) {
  if (table) {
    return await listTableColumnsSimple(conn, database, table)
  }
  const allTables = (await listTables(conn)) || []
  const allViews = (await listViews(conn)) || []
  const tables = allTables.concat(allViews)
  const everything = tables.map((table) => {
    return {
      tableName: table.name,
      sql: `PRAGMA table_info(${table.name})`,
      results: null
    }
  })

  const query = everything.map((e) => e.sql).join(";")
  const allResults = await driverExecuteQuery(conn, { query, multiple: true })
  log.info("ALL RESULTS", allResults)
  const results = allResults.map((r, i) => {
    return {
      result: r,
      ...everything[i]
    }
  })
  log.info("RESULTS", results)
  const final = _.flatMap(results, (item, idx) => dataToColumns(item.result.data, item.tableName))
  return final
}

export async function listTableTriggers(conn, table) {
  const sql = `
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'trigger'
      AND tbl_name = '${table}'
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data
}

export async function listTableIndexes(conn, database, table) {
  const sql = `PRAGMA INDEX_LIST('${table}')`;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  const allSQL = data.map((row) => `PRAGMA INDEX_INFO(${row.name})`).join(";")
  const infos = await driverExecuteQuery(conn, { query: allSQL, multiple: true})

  const indexColumns = infos.map((result) => {
    return result.data.map((r) => r.name).join(", ")
  })

  return data.map((row, idx) => ({
    id: row.seq,
    name: row.name,
    unique: row.unique === 1,
    primary: row.origin === 'pk',
    columns: indexColumns[idx]
  }))
}

export function listSchemas() {
  return Promise.resolve([]); // DOES NOT SUPPORT IT
}

export async function listDatabases(conn) {
  const result = await driverExecuteQuery(conn, { query: 'PRAGMA database_list;' });

  return result.data.map((row) => row.file || ':memory:');
}

export function getTableReferences() {
  return Promise.resolve([]); // TODO: not implemented yet
}

export async function getPrimaryKeys(conn, database, table) {
  const sql = `pragma table_info('${escapeString(table)}')`
  const { data } = await driverExecuteQuery(conn, { query: sql})
  const found = data.filter(r => r.pk > 0)
  if (!found || found.length === 0) return []
  return found.map((r) => ({
    columnName: r.name,
    position: Number(r.pk)
  }))

}

export async function getPrimaryKey(conn, database, table) {
  const keys = await getPrimaryKeys(conn, database, table)
  return keys.length === 1 ? keys[0].columnName : null
}

export async function getTableKeys(conn, database, table) {
  const sql = `pragma foreign_key_list('${escapeString(table)}')`
  log.debug("running SQL", sql)
  const { data } = await driverExecuteQuery(conn, { query: sql });
  log.debug("response", data)
  return data.map(row => ({
    constraintName: row.id,
    constraintType: 'FOREIGN',
    toTable: row.table,
    fromTable: table,
    fromColumn: row.from,
    toColumn: row.to,
    onUpdate: row.on_update,
    onDelete: row.on_delete
  }))
}

export async function getTableCreateScript(conn, table) {
  const sql = `
    SELECT sql
    FROM sqlite_master
    WHERE name = '${table}';
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => row.sql);
}

export async function getViewCreateScript(conn, view) {
  const sql = `
    SELECT sql
    FROM sqlite_master
    WHERE name = '${view}';
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => row.sql);
}

export function getRoutineCreateScript() {
  return Promise.resolve([]); // DOES NOT SUPPORT IT
}

export async function truncateAllTables(conn) {
  await runWithConnection(conn, async (connection) => {
    const connClient = { connection };

    const tables = await listTables(connClient);

    const truncateAll = tables.map((table) => `
      DELETE FROM ${table.name};
    `).join('');

    // TODO: Check if sqlite_sequence exists then execute:
    // DELETE FROM sqlite_sequence WHERE name='${table}';

    await driverExecuteQuery(connClient, { query: truncateAll });
  });
}

export async function getTableProperties(conn, table) {

  const [
    length,
    indexes,
    triggers,
    relations
  ] = await Promise.all([
    getTableLength(conn, table, undefined),
    listTableIndexes(conn, undefined, table),
    listTableTriggers(conn, table),
    getTableKeys(conn, null, table)
  ])
  return {
    length, indexes, relations, triggers
  }
}


function configDatabase(server, database) {
  return {
    database: database.database,
  };
}


function parseRowQueryResult({ data, statement, changes }) {
  // Fallback in case the identifier could not reconize the command
  const isSelect = Array.isArray(data);
  const rows = data || [];
  return {
    command: statement.type || (isSelect && 'SELECT'),
    rows,
    fields: Object.keys(rows[0] || {}).map((name) => ({ name, id: name })),
    rowCount: data && data.length,
    affectedRows: changes || 0,
  };
}


function identifyCommands(queryText) {
  try {
    return identify(queryText, { strict: false, dialect: 'sqlite' });
  } catch (err) {
    return [];
  }
}

export function driverExecuteQuery(conn, queryArgs) {
  const runQuery = (connection, { text }) => new Promise((resolve, reject) => {
    const params = queryArgs.params || []
    log.info(text, params)
    const statement = connection.prepare(text)

    try {
      const result = statement.reader ? statement.all(params) : statement.run(params)

      log.info('result', result)
      resolve({
        data: result || []
      })

    } catch (error) {
      console.log(error)
      reject(error)
    }
  });

  const identifyStatementsRunQuery = async (connection) => {
    const statements = identifyCommands(queryArgs.query);

    const results = []

    // we do it this way to ensure the queries are run IN ORDER
    for (let index = 0; index < statements.length; index++) {
      const statement = statements[index];
      const r = await runQuery(connection, statement)
      results.push({...r, statement})
    }

    return queryArgs.multiple ? results : results[0];
  };

  return conn.connection
    ? identifyStatementsRunQuery(conn.connection)
    : runWithConnection(conn, identifyStatementsRunQuery);
}

async function runWithConnection(conn, run) {
  let db
  try {
    db = new Database(conn.dbConfig.database)
    const results = await run(db)
    return results
  } finally {
    if (db) {
      db.close()
    }
  }
}
