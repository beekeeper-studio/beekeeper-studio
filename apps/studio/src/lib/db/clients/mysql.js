// Copyright (c) 2015 The SQLECTRON Team
import { MySqlChangeBuilder } from '@shared/lib/sql/change_builder/MysqlChangeBuilder';
import rawLog from 'electron-log';
import { readFileSync } from 'fs';
import knexlib from 'knex';
import _ from 'lodash';
import mysql from 'mysql2';
import { identify } from 'sql-query-identifier';
import globals from '../../../common/globals';
import { createCancelablePromise } from '../../../common/utils';
import { errors } from '../../errors';
import { MysqlCursor } from './mysql/MySqlCursor';
import { buildDeleteQueries, buildInsertQueries, buildUpdateQueries, buildInsertQuery, buildSelectTopQuery, escapeString, joinQueries, escapeLiteral, applyChangesSql } from './utils';
import { MysqlData } from '@shared/lib/dialects/mysql'
import { ClientError } from '../client';


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

  const versionInfo = await getVersion(conn)

  return {
    supportedFeatures: () => ({ customRoutines: true, comments: true, properties: true, partitions: false, editPartitions: false }),
    versionString: () => getVersionString(versionInfo),
    wrapIdentifier,
    defaultSchema: () => null,
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
    listDatabases: (filter) => listDatabases(conn, filter),

    // db creation
    listCharsets: () => listCharsets(conn),
    getDefaultCharset: () => getDefaultCharset(conn),
    listCollations: (charset) => listCollations(conn, charset),
    createDatabase: (databaseName, charset, collation) => createDatabase(conn, databaseName, charset, collation),

    // tabletable
    getTableLength: (table) => getTableLength(conn, table),
    selectTop: (table, offset, limit, orderBy, filters, schema, selects) => selectTop(conn, table, offset, limit, orderBy, filters, selects),
    selectTopStream: (db, table, orderBy, filters, chunkSize, schema) => selectTopStream(conn, db, table, orderBy, filters, chunkSize, schema),
    selectTopSql: (table, offset, limit, orderBy, filters, schema, selects) => selectTopSql(conn, table, offset, limit, orderBy, filters, selects),
    queryStream: (db, query, chunkSize) => queryStream(conn, db, query, chunkSize),
    applyChangesSql: (changes) => applyChangesSql(changes, knex),
    getInsertQuery: (tableInsert) => getInsertQuery(conn, database.database, tableInsert),
    getQuerySelectTop: (table, limit) => getQuerySelectTop(conn, table, limit),
    getTableCreateScript: (table) => getTableCreateScript(conn, table),
    getViewCreateScript: (view) => getViewCreateScript(conn, view),
    getMaterializedViewCreateScript: () => Promise.resolve([]),
    getRoutineCreateScript: (routine, type) => getRoutineCreateScript(conn, routine, type),
    truncateAllTables: () => truncateAllTables(conn),
    getTableProperties: (table) => getTableProperties(conn, table),
    setTableDescription: (table, description) => setTableDescription(conn, table, description),

    // schema
    alterTableSql: (change) => alterTableSql(conn, change),
    alterTable: (change) => alterTable(conn, change),

    // indexes
    alterIndexSql: (adds, drops) => alterIndexSql(adds, drops),
    alterIndex: (adds, drops) => alterIndex(conn, adds, drops),

    // relations
    alterRelationSql: (payload) => alterRelationSql(payload),
    alterRelation: (payload) => alterRelation(conn, payload),

    // remove things
    dropElement: (elementName, typeOfElement) => dropElement(conn, elementName, typeOfElement),
    truncateElement: (elementName, typeOfElement) => truncateElement(conn, elementName, typeOfElement),

    // duplicate table
    duplicateTableSql: (tableName, newTableName) => duplicateTableSql(tableName, newTableName),
    duplicateTable: (tableName, newTableName) => duplicateTable(conn, tableName, newTableName)

  };
}


export function disconnect(conn) {
  conn.pool.end();
}

async function getVersion(conn) {
  const { data } = await driverExecuteQuery(conn, { query: 'SELECT VERSION() as v' })
  const version = data[0]['v']
  if (!version) {
    return {
      versionString: '',
      isMariaDb: false,
      isMySql: true,
      version: 5.7
    }
  }

  const stuff = version.split("-")

  return {
    versionString: version,
    isMariaDb: version.toLowerCase().includes('mariadb'),
    isMySql: !version.toLowerCase().includes("mariadb"),
    version: Number(stuff[0] || 0)
  }

}

function getVersionString(versionInfo) {
  return versionInfo.versionString
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

function resolveDefault(version, defaultValue) {
  // adapted from https://github.com/PomeloFoundation/Pomelo.EntityFrameworkCore.MySql/pull/998/files
  if (version.isMySql) return defaultValue

  if (!defaultValue) return null

  if (defaultValue.toString().toLowerCase() === "'null'") {
    return null;
  }

  if (defaultValue.startsWith("'") &&
    defaultValue.endsWith("'") &&
    defaultValue.length >= 2) {
    // MariaDb escapes all single quotes with two single quotes in default value strings, even if they are
    // escaped with backslashes in the original `CREATE TABLE` statement.
    return defaultValue.substring(1, defaultValue.length - 1)
      .replaceAll("''", "'");
  }

  return defaultValue;

}

export async function listTableColumns(conn, database, table) {
  const clause = table ? `AND table_name = ?` : ''
  const sql = `
    SELECT
      table_name AS 'table_name',
      column_name AS 'column_name',
      column_type AS 'data_type',
      is_nullable AS 'is_nullable',
      column_default as 'column_default',
      ordinal_position as 'ordinal_position',
      COLUMN_COMMENT as 'column_comment',
      extra as 'extra'
    FROM information_schema.columns
    WHERE table_schema = database()
    ${clause}
    ORDER BY ordinal_position
  `;

  const params = table ? [table] : []
  const version = await getVersion(conn)

  const { data } = await driverExecuteQuery(conn, { query: sql, params });
  return data.map((row) => ({
    tableName: row.table_name,
    columnName: row.column_name,
    dataType: row.data_type,
    ordinalPosition: Number(row.ordinal_position),
    nullable: row.is_nullable === 'YES',
    defaultValue: resolveDefault(version, row.column_default),
    extra: _.isEmpty(row.extra) ? null : row.extra,
    comment: _.isEmpty(row.column_comment) ? null : row.column_comment
  }));
}

async function getTableLength(conn, table) {
  const tableCheck = 'SELECT TABLE_TYPE as tt FROM INFORMATION_SCHEMA.TABLES where table_schema = database() and TABLE_NAME = ?'
  const tcResult = await driverExecuteQuery(conn, { query: tableCheck, params: [table] })
  const isTable = tcResult.data[0] && tcResult.data[0]['tt'] === 'BASE TABLE'

  const queries = buildSelectTopQuery(table, 1, 1, [], [])
  let title = 'total'
  if (isTable) {
    queries.countQuery = `show table status like '${table}'`
    title = 'Rows'
  }
  const { countQuery, params } = queries
  const countResults = await driverExecuteQuery(conn, { query: countQuery, params })
  const rowWithTotal = countResults.data.find((row) => { return row[title] })
  const totalRecords = rowWithTotal ? rowWithTotal[title] : 0
  return Number(totalRecords)
}



export async function selectTop(conn, table, offset, limit, orderBy, filters, selects) {
  const columns = await listTableColumns(conn, null, table)
  const queries = buildSelectTopQuery(table, offset, limit, orderBy, filters, 'total', columns, selects)

  const { query, params } = queries

  const result = await driverExecuteQuery(conn, { query, params })
  return {
    result: result.data,
    fields: Object.keys(result.data[0] || {})
  }

}

export async function selectTopStream(conn, db, table, orderBy, filters, chunkSize) {
  const qs = buildSelectTopQuery(table, null, null, orderBy, filters)
  const columns = await listTableColumns(conn, db, table)
  const rowCount = await getTableLength(conn, table, filters)
  // TODO: DEBUG HERE
  const { query, params } = qs

  return {
    totalRows: rowCount,
    columns,
    cursor: new MysqlCursor(conn, query, params, chunkSize)
  }
}

export async function selectTopSql(
  conn,
  table,
  offset,
  limit,
  orderBy,
  filters,
  schema,
  selects
) {
  const columns = await listTableColumns(conn, null, table);
  const { query, params } = buildSelectTopQuery(
    table,
    offset,
    limit,
    orderBy,
    filters,
    "total",
    columns,
    selects
  );
  return knex.raw(query, params).toQuery();
}

export async function queryStream(conn, db, query, chunkSize) {
  const theCursor = new MysqlCursor(conn, query, [], chunkSize)
  log.debug('results', theCursor)

  return {
    totalRows: undefined, // rowCount,
    columns: undefined, // theCursor.result.columns,
    cursor: theCursor
  }
}

export async function listTableTriggers(conn, table) {
  const sql = `
    SELECT
      trigger_name as name,
      event_object_schema as table_schema,
      event_object_table as table_name,
      event_manipulation as trigger_manipulation,
      action_statement as trigger_action,
      action_timing as trigger_timing,
      action_condition as trigger_condition
    FROM information_schema.triggers
    WHERE event_object_schema = database()
    AND event_object_table = ?
  `;

  const params = [
    table,
  ];

  const { data } = await driverExecuteQuery(conn, { query: sql, params });

  return data.map((row) => ({
    name: row.name,
    timing: row.trigger_timing,
    manipulation: row.trigger_manipulation,
    action: row.trigger_action,
    condition: row.trigger_condition,
    table: row.table_name,
    schema: null,
  }))
}

export async function listTableIndexes(conn, database, table) {
  const sql = 'SHOW INDEX FROM ??';

  const params = [
    table,
  ];

  const { data } = await driverExecuteQuery(conn, { query: sql, params });

  const grouped = _.groupBy(data, 'Key_name')

  return Object.keys(grouped).map((key, idx) => {
    const row = grouped[key][0]
    const columns = grouped[key].map((r) => ({ name: r.Column_name, order: r.Collation === 'A' ? 'ASC' : 'DESC' }))
    return {
      id: idx,
      name: row.Key_name,
      unique: row.Non_unique === '0',
      primary: row.Key_name === 'PRIMARY',
      columns,
      table,
    }
  })

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

export async function getPrimaryKeys(conn, database, table) {
  logger().debug('finding primary keys for', database, table)
  const sql = `SHOW KEYS FROM ?? WHERE Key_name = 'PRIMARY'`
  const params = [
    table,
  ];
  const { data } = await driverExecuteQuery(conn, { query: sql, params })

  if (!data || data.length === 0) return []

  return data.map((r) => ({
    columnName: r.Column_name,
    position: r.Seq_in_index
  }))
}

export async function getPrimaryKey(conn, database, table) {
  const res = await getPrimaryKeys(conn, database, table)
  return res.length === 1 ? res[0].columnName : null
}

export async function getTableKeys(conn, database, table) {
  const sql = `
    SELECT
      cu.constraint_name as 'constraint_name',
      cu.column_name as 'column_name',
      cu.referenced_table_name as 'referenced_table_name',
      IF(cu.referenced_table_name IS NOT NULL, 'FOREIGN', cu.constraint_name) as key_type,
      cu.REFERENCED_TABLE_NAME as referenced_table,
      cu.REFERENCED_COLUMN_NAME as referenced_column,
      rc.UPDATE_RULE as on_update,
      rc.DELETE_RULE as on_delete
    FROM information_schema.key_column_usage cu
    JOIN information_schema.referential_constraints rc
      on cu.constraint_name = rc.constraint_name
      and cu.constraint_schema = rc.constraint_schema
    WHERE table_schema = database()
    AND cu.table_name = ?
    AND cu.referenced_table_name IS NOT NULL
  `;

  const params = [
    table,
  ];

  const { data } = await driverExecuteQuery(conn, { query: sql, params });

  return data.map((row) => ({
    constraintName: `${row.constraint_name}`,
    toTable: row.referenced_table,
    toColumn: row.referenced_column,
    fromTable: table,
    fromColumn: row.column_name,
    referencedTable: row.referenced_table_name,
    keyType: `${row.key_type} KEY`,
    onDelete: row.on_delete,
    onUpdate: row.on_update
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
            throw err
          } else if (queryText && _.trim(queryText).toUpperCase().startsWith("DELIMITER")) {
            const nuError = new ClientError(`DELIMITER is only supported in the command line client, ${err.message}`)
            nuError.helpLink = "https://docs.beekeeperstudio.io/pages/troubleshooting#mysql"
            throw nuError
          } else {
            throw err;
          }
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
    await driverExecuteQuery(cli, { query: 'START TRANSACTION' })

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

      await driverExecuteQuery(cli, { query: 'COMMIT' })
    } catch (ex) {
      logger().error("query exception: ", ex)
      await driverExecuteQuery(cli, { query: 'ROLLBACK' });
      throw ex
    }
  })

  return results
}

export async function insertRows(cli, inserts) {
  for (const insert of inserts) {

    const columns = await listTableColumns(cli, null, insert.table)
    const command = buildInsertQuery(knex, insert, columns)
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

    const params = [value];
    const whereList = []
    update.primaryKeys.forEach(({ column, value }) => {
      console.log('updateValues, column, value', column, value)
      whereList.push(`${wrapIdentifier(column)} = ?`);
      params.push(value);
    })

    const where = whereList.join(" AND ");


    return {
      query: `UPDATE ${wrapIdentifier(update.table)} SET ${wrapIdentifier(update.column)} = ? WHERE ${where}`,
      params: params
    }
  })

  const results = []
  // TODO: this should probably return the updated values
  for (let index = 0; index < commands.length; index++) {
    const blob = commands[index];
    await driverExecuteQuery(cli, blob)
  }

  const returnQueries = updates.map(update => {

    const params = [];
    const whereList = []
    update.primaryKeys.forEach(({ column, value }) => {
      console.log('updateValues, column, value', column, value)
      whereList.push(`${wrapIdentifier(column)} = ?`);
      params.push(value);
    })

    const where = whereList.join(" AND ");

    return {
      query: `select * from ${wrapIdentifier(update.table)} where ${where}`,
      params: params
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

  return data.map((_, idx) => parseRowQueryResult(data[idx], fields[idx], commands[idx], rowsAsArray));
}


export async function listDatabases(conn, filter) {
  const sql = 'show databases';

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data
    .filter((item) => filterDatabase(item, filter, 'Database'))
    .map((row) => row.Database);
}

async function getInsertQuery(conn, database, tableInsert) {
  const columns = await listTableColumns(conn, database, tableInsert.table, tableInsert.schema)
  return buildInsertQuery(knex, tableInsert, columns)
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
  const result = data.map((row) => {
    const upperCaseIndexedRow = Object.keys(row).reduce((prev, current) => ({ ...prev, [current.toUpperCase()]: row[current] }), {});
    return upperCaseIndexedRow[`CREATE ${type.toUpperCase()}`];
  });
  return result;
}

export function wrapIdentifier(value) {
  return (value !== '*' ? `\`${value.replaceAll(/`/g, '``')}\`` : '*');
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

export async function dropElement(conn, elementName, typeOfElement) {
  await runWithConnection(conn, async (connection) => {
    const connClient = { connection }
    const sql = `DROP ${MysqlData.wrapLiteral(typeOfElement)} ${wrapIdentifier(elementName)}`

    await driverExecuteQuery(connClient, { query: sql })
  });
}
export async function truncateElement(conn, elementName, typeOfElement) {
  await runWithConnection(conn, async (connection) => {
    const connClient = { connection }
    const sql = `TRUNCATE ${MysqlData.wrapLiteral(typeOfElement)} ${wrapIdentifier(elementName)}`

    await driverExecuteQuery(connClient, { query: sql })
  });
}

export async function duplicateTable(conn, tableName, duplicateTableName) {
  const sql = duplicateTableSql(tableName, duplicateTableName);
  await driverExecuteQuery(conn, { query: sql });
}

export function duplicateTableSql(tableName, duplicateTableName) {
  let sql = `CREATE TABLE ${wrapIdentifier(duplicateTableName)} LIKE ${wrapIdentifier(tableName)};`;
  sql += `INSERT INTO ${wrapIdentifier(duplicateTableName)} SELECT * FROM ${wrapIdentifier(tableName)};`;
  return sql;
}


export async function getTableProperties(conn, table) {
  const propsSql = `
    SELECT
      table_comment as description,
      data_length as data_size,
      index_length as index_size
    FROM INFORMATION_SCHEMA.tables
    where table_schema = database()
    and table_name = ?
  `

  const { data } = await driverExecuteQuery(conn, { query: propsSql, params: [table] })
  const {
    description,
    data_size,
    index_size
  } = data.length > 0 ? data[0] : {}

  const length = await getTableLength(conn, table, [])
  const relations = await getTableKeys(conn, null, table)
  const triggers = await listTableTriggers(conn, table)
  const indexes = await listTableIndexes(conn, null, table)

  return {
    description: description || undefined,
    indexSize: Number(index_size),
    size: Number(data_size),
    length,
    indexes,
    relations,
    triggers
  }
}

async function setTableDescription(conn, table, description) {
  const query = `ALTER TABLE ${wrapIdentifier(table)} COMMENT = '${escapeString(description)}'`
  await driverExecuteQuery(conn, { query })
  const result = await getTableProperties(conn, table)
  return result.description
}
async function alterTableSql(conn, change) {
  const columns = await listTableColumns(conn, null, change.table)
  const builder = new MySqlChangeBuilder(change.table, columns)
  return builder.alterTable(change)
}

async function alterTable(_conn, change) {
  await runWithTransaction(_conn, async (connection) => {
    const cli = { connection }
    const query = await alterTableSql(cli, change)
    return await driverExecuteQuery(cli, { query })
  })
}

export function alterIndexSql(payload) {
  const { table, schema, additions, drops } = payload
  const changeBuilder = new MySqlChangeBuilder(table, schema, [])
  const newIndexes = changeBuilder.createIndexes(additions)
  const droppers = changeBuilder.dropIndexes(drops)
  return [newIndexes, droppers].filter((f) => !!f).join(";")
}

export async function alterIndex(conn, payload) {
  const sql = alterIndexSql(payload);
  await executeWithTransaction(conn, { query: sql });
}


export function alterRelationSql(payload) {
  const { table, schema } = payload
  const builder = new MySqlChangeBuilder(table, schema, [])
  const creates = builder.createRelations(payload.additions)
  const drops = builder.dropRelations(payload.drops)
  return [creates, drops].filter((f) => !!f).join(";")
}

export async function alterRelation(conn, payload) {
  const query = alterRelationSql(payload)
  await executeWithTransaction(conn, { query });
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
    connectTimeout: 60 * 60 * 1000,
  };

  if (server.config.socketPathEnabled) {
    config.socketPath = server.config.socketPath;
    config.host = null;
    config.port = null;
    return config;
  }

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
  });
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

async function executeWithTransaction(conn, queryArgs) {
  const fullQuery = joinQueries([
    'START TRANSACTION', queryArgs.query, 'COMMIT'
  ])
  return await runWithConnection(conn, async (connection) => {
    const cli = { connection }
    try {
      return await driverExecuteQuery(cli, { ...queryArgs, query: fullQuery })
    } catch (ex) {
      log.error("executeWithTransaction", fullQuery, ex)
      await driverExecuteQuery(cli, { query: 'ROLLBACK' })
      throw ex
    }
  })
}

function driverExecuteQuery(conn, queryArgs) {
  const runQuery = (connection) => new Promise((resolve, reject) => {
    const params = !queryArgs.params || _.isEmpty(queryArgs.params) ? undefined : queryArgs.params
    logger().info(`Running Query`, queryArgs.query, params)
    connection.query({ sql: queryArgs.query, values: params, rowsAsArray: queryArgs.rowsAsArray }, (err, data, fields) => {
      if (err && err.code === mysqlErrors.EMPTY_QUERY) return resolve({});
      if (err) return reject(getRealError(connection, err));

      logger().info(`Running Query Finished`)
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

async function runWithTransaction(conn, func) {
  await runWithConnection(conn, async (connection) => {
    const cli = { connection }
    try {
      await driverExecuteQuery(cli, { query: 'START TRANSACTION' })
      const result = await func(connection)
      await driverExecuteQuery(cli, { query: 'COMMIT' })
      return result
    } catch (ex) {
      await driverExecuteQuery(cli, { query: 'ROLLBACK' })
      console.error(ex)
      throw ex
    }
  })
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

export async function listCharsets(conn) {
  const sql = 'show character set'
  const { data } = await driverExecuteQuery(conn, { query: sql })

  return data.map((row) => row.Charset).sort()
}

export async function getDefaultCharset(conn) {
  const sql = "SHOW VARIABLES LIKE 'character_set_server'"
  const { data } = await driverExecuteQuery(conn, { query: sql })

  return data[0].Value;
}

export async function listCollations(conn, charset) {
  const sql = 'show collation where charset = ?'

  const params = [
    charset
  ]

  const { data } = await driverExecuteQuery(conn, { query: sql, params });
  return data.map((row) => row.Collation).sort()
}

export async function createDatabase(conn, databaseName, charset, collation) {
  const sql = `create database ${wrapIdentifier(databaseName)} character set ${wrapIdentifier(charset)} collate ${wrapIdentifier(collation)}`;
  await driverExecuteQuery(conn, { query: sql })
}

export const testOnly = {
  parseFields
}
