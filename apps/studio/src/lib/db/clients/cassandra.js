// Copyright (c) 2015 The SQLECTRON Team

import { readFileSync } from 'fs';
import rawLog from 'electron-log'
import _ from 'lodash'
import { identify } from 'sql-query-identifier';
import * as cassandra from 'cassandra-driver';
import knexlib from 'knex'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CassandraKnex = require('cassandra-knex/dist/cassandra_knex.cjs')
import globals from '../../../common/globals'
import { createCancelablePromise } from '../../../common/utils';
import { errors } from '../../errors'
import { buildInsertQuery, isAllowedReadOnlyQuery, errorMessages } from './utils'
import { CassandraData, dataTypesToMatchTypeCode } from '@shared/lib/dialects/cassandra'
import { CassandraChangeBuilder } from '@shared/lib/sql/change_builder/CassandraChangeBuilder'
import { ClientError } from '../client'
import { CassandraCursor } from './cassandra/CassandraCursor'

let dbReadOnlyMode = false
const log = rawLog.scope('cassandra')
const logger = () => log;
let knex

/**
 * To keep compatibility with the other clients we treat keyspaces as database.
 */

export default function (server, database) {
  return new Promise((resolve, reject) => {
    const db = database?.database
    const dbConfig = configDatabase(server, database);

    logger().debug('creating database client %j', dbConfig);
    const client = new cassandra.Client(dbConfig)

    console.log('~~~ db config ~~~')
    console.log(dbConfig)

    // TODO: need to get the password and whatnot passed in stuff
    knex  = knexlib({
      client: CassandraKnex,
      connection: {
        contactPoints: dbConfig.contactPoints,
        localDataCenter: dbConfig.localDataCenter,
      }
    })

    // this was testing out the knex connection to make sure it could do the things ok
    // const d = knex.withSchema(db).select().from('shopping_cart').toQuery()
    // console.log(d)
    dbReadOnlyMode = server?.config?.readOnlyMode || false

    logger().debug('connecting');
    client.connect(async (err) => {
      if (err) {
        client.shutdown();
        return reject(err);
      }
      const versionInfo = await getVersion(client)

      logger().debug('connected');
      resolve({
        supportedFeatures: () => ({ customRoutines: false, comments: true, properties: true, partitions: false, backups: false, backDirFormat: false, restore: false }),
        versionString: () => getVersionString(versionInfo),
        wrapIdentifier,
        defaultSchema: () => null,
        disconnect: () => disconnect(client),
        listTables: () => listTables(client, db),
        listViews: () => Promise.resolve([]), // TODO: Make sure Cassandra doesn't actually do these things
        listMaterializedViews: () => Promise.resolve([]), // TODO: Make sure Cassandra doesn't  actually do this
        listRoutines: () => Promise.resolve([]), // TODO: Make sure Cassandra doesn't actually do these things
        listTableColumns: (db, table) => listTableColumns(client, db, table),
        listTableTriggers: () => Promise.resolve([]), // TODO: Make sure this isn't a thing since nosql so no real triggers
        listTableIndexes: () => Promise.resolve([]), // TODO: probably, but I think they don't really exist because you should be writing it better or something, idk
        listSchemas: () => Promise.resolve([]), // TODO: Make sure Cassandra doesn't actually do these things
        getTableReferences: () => Promise.resolve([]), // TODO: Make sure this isn't a thing since you shouldn't be doing joins anyway?
        getTableKeys: (db, table) => getTableKeys(client, db, table),
        query: (queryText) => query(client, queryText),
        executeQuery: (queryText) => executeQuery(client, queryText),
        listDatabases: () => listDatabases(client),
        getMaterializedViewCreateScript: (view) => Promise.resolve([]),

        getPrimaryKey: (db, table) => getPrimaryKey(client, db, table),
        getPrimaryKeys: (db, table) => getPrimaryKeys(client, db, table),
        applyChanges: (changes) => applyChanges(client, changes), // TODO

        // db creation
        listCharsets: () => ['SimpleStrategy', 'NetworkTopologyStrategy'], // Local strategy was omitted from the list of strategies because it sounds like it's just for internal stuff (https://www.geeksforgeeks.org/replication-strategy-in-cassandra/)
        getDefaultCharset: () => 'NetworkTopologyStrategy',
        listCollations: () => Array.from({length: 10}, (e,i) => i + 1),
        createDatabase: ( databaseName, strategy, replicationFactor) => createDatabase(client, databaseName, strategy, replicationFactor),

        duplicateTable: (tableName, duplicateTableName) => duplicateTable(client, tableName, duplicateTableName),
        duplicateTableSql: (tableName, duplicateTableName) => duplicateTableSql(tableName, duplicateTableName),

        // tabletable
        getTableLength: (table) => getTableLength(client, table),
        selectTop: (table, offset, limit, orderBy, filters, schema, selects, options) => selectTop(client, table, offset, limit, orderBy, filters, db, selects, options), // TODO
        selectTopSql: (table, offset, limit, orderBy, filters, schema, selects, options) => selectTopSql(client, table, offset, limit, orderBy, filters, db, selects, options),
        selectTopStream: (db, table, orderBy, filters, chunkSize, schema) => selectTopStream(client, db, table, orderBy, filters, chunkSize, schema), // TODO
        getInsertQuery: (tableInsert) => getInsertQuery(client, database.database, tableInsert),
        getQuerySelectTop: (table, limit) => getQuerySelectTop(client, table, limit),
        getTableCreateScript: (table) => getTableCreateScript(client, db, table),
        getViewCreateScript: () => Promise.resolve(''), // TODO: Views aren't really a thing in Cassandra
        getRoutineCreateScript: () => Promise.resolve(''), // TODO: Routines really don't exist in Cassandra
        truncateAllTables: (db) => truncateAllTables(client, db), // TODO: Test this to make sure it's ok. That should be an integration test
        getTableProperties: (table) => getTableProperties(client, table),
        // setTableDescription: (table, description) => setTableDescription(client, table, description), // TODO


        // schema
        alterTableSql: (change) => alterTableSql(client, change),
        alterTable: (change) => alterTable(client, change),

        // indexes
        // alterIndexSql: (adds, drops) => alterIndexSql(adds, drops), // TODO
        // alterIndex: (adds, drops) => alterIndex(client, adds, drops), // TODO

        // relations
        // alterRelationSql: (payload) => alterRelationSql(payload), // TODO
        // alterRelation: (payload) => alterRelation(client, payload), // TODO

        // remove things
        dropElement: (elementName, typeOfElement) => dropElement(client, elementName, typeOfElement),
        truncateElement: (elementName, typeOfElement) => truncateElement(client, elementName, typeOfElement),
      });
    });
  });
}


export function disconnect(client) {
  client.shutdown();
}

// this helped for understanding how replication strategies worked: https://www.geeksforgeeks.org/replication-strategy-in-cassandra/
export async function createDatabase(conn, databaseName, strategy, replicationFactor) {
  const datacenters = Object.keys(conn.metadata.datacenters)
  const rf = (strategy === 'NetworkTopologyStrategy') ?
    `${datacenters.map(dc => `'${dc}': ${replicationFactor}`).join(', ')}` :
    `'replication_factor': ${replicationFactor}`
  const query = `CREATE KEYSPACE ${wrapIdentifier(databaseName)} WITH REPLICATION = {'class': '${strategy}', ${rf}};`

  await driverExecuteQuery(conn, { query })
}

export function listTables(client, database) {
  return new Promise((resolve, reject) => {
    let sql
    let params = []
    if (database) {
      sql =
      `
        SELECT table_name as name
        FROM system_schema.tables
        WHERE keyspace_name = ?;
      `
      params = [database];
    } else {
      sql =
      `
        SELECT table_name as name
        FROM system_schema.tables;
      `

    }
    client.execute(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data.rows.map((row) => ({ name: row.name })));
    });
  });
}

// TODO: Make sure this isn't actually used by Cassandra
// export function listViews() {
  //   return Promise.resolve([]);
  // }

// TODO: Make sure this isn't actually used by Cassandra
// export function listRoutines() {
//   return Promise.resolve([]);
// }

export function listTableColumns(client, database, table) {
  return new Promise((resolve, reject) => {
    let sql
    let params = [table]
    // allow filtering explained a bit: https://www.datastax.com/blog/allow-filtering-explained
    if (database) {
      sql = `
        SELECT position, column_name, type
        FROM system_schema.columns
        WHERE table_name = ?
        AND keyspace_name = ?
        ALLOW FILTERING;
      `
      params.push(database)
    } else {
      sql = `
        SELECT position, column_name, type
        FROM system_schema.columns
        WHERE table_name = ?
        ALLOW FILTERING;
      `
    }
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

// TODO: Make sure Cassandra doesn't actually have triggers. Shouldn't because nosql
// export function listTableTriggers() {
//   return Promise.resolve([]);
// }

// TODO: Make sure Cassandra doesn't actually have have indexes.
// export function listTableIndexes(client, keyspace, table) {
//   return Promise.resolve([]);
// }

// TODO: Make sure Cassandra doesn't actually have triggers. Shouldn't because nosql
// export function listSchemas() {
//   return Promise.resolve([]);
// }

// TODO: Make sure Cassandra doesn't actually have triggers. Shouldn't because nosql
// export function getTableReferences() {
//   return Promise.resolve([]);
// }

export function getTableKeys(client, database, table) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT column_name
      FROM system_schema.columns
      WHERE table_name = ?
        AND kind = 'partition_key'
      ALLOW FILTERING
    `;
    const params = [
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

export async function selectTopStream(conn, db, table, orderBy, filters, chunkSize) {
  const qs = buildSelectTopQuery(table, null, null, orderBy, filters)
  const columns = await listTableColumns(conn, db, table)
  const rowCount = await getTableLength(conn, table, filters)
  // TODO: DEBUG HERE
  const { query, params } = qs

  console.log('~~~ qs ~~~')
  console.log(qs)

  return {
    totalRows: rowCount,
    columns,
    cursor: new CassandraCursor(conn, query, params, chunkSize)
  }
}

export function buildFilterString(filters, options = {}) {
  const inlineParams = options.inlineParams
  let filterString = ""
  let filterParams = []
  if (filters && _.isArray(filters) && filters.length > 0) {
    filterString = "WHERE " + filters.map((item) => {
      const field = wrapIdentifier(item.field);
      if (item.type === 'in') {
        let values = ''
        if (_.isArray(item.value)) {
          values = item.value.map((v) => (inlineParams ? v : "?")).join(",")
        } else {
          values = inlineParams ? item.value : "?"
        }
        return `${field} ${item.type} (${values})`
      }

      const value = inlineParams ? item.value : "?"

      return `${field} ${item.type} ${value}`
    }).join(" AND ")

    filterParams = filters.flatMap((item) => {
      return _.isArray(item.value) ? item.value : [item.value]
    })
  } else if (_.isString(filters)) {
    filterString = filters
  }
  return {
    filterString, filterParams
  }
}

// ripped right from the postgres file so there's some possible overflow.
// removed "order by" as it has many rules to get running through. One suggestion was using Materialized Views
// https://www.datastax.com/blog/new-cassandra-30-materialized-views
function buildSelectTopQueries(options) {
  const filters = options.filters
  const orderBy = options.orderBy
  const selects = options.selects ?? ['*']
  const inlineParams = options.inlineParams ?? false
  let orderByString = ""

  if (orderBy && orderBy.length > 0) {
    orderByString = "ORDER BY " + (orderBy.map((item) => {
      if (_.isObject(item)) {
        return `${wrapIdentifier(item.field)} ${item.dir}`
      } else {
        return wrapIdentifier(item)
      }
    })).join(",")
  }

  const { filterString, filterParams } = buildFilterString(filters, { inlineParams })

  const selectSQL = `SELECT ${selects.join(', ')}`
  const baseSQL = `
    FROM ${fqTableName(options.table, options.schema)}
    ${filterString}
  `
  const allowFilter = options.allowFilter ? 'ALLOW FILTERING' : ''
  const query = `${selectSQL} ${baseSQL} ${allowFilter};`
  // FIXME: Implement paging through results using 'token', see below
  // https://www.codesandnotes.be/2015/10/01/cassandra-pagination-for-stateless-web-apps-using-cql-or-querybuilder/
  return {
    query, params: filterParams
  }
}

function buildSelectTopQuery(table, offset, limit, orderBy, filters, countTitle = 'total', columns = [], selects = ['*']) {
  log.debug('building selectTop for', table, offset, limit, orderBy, selects)

  let filterString = ''
  let filterParams = []
  if (_.isString(filters)) {
    filterString = `WHERE ${filters}`
  } else {
    const filterBlob = buildFilterString(filters, columns)
    filterString = filterBlob.filterString
    filterParams = filterBlob.filterParams
  }

  const selectSQL = `SELECT ${selects.map((s) => wrapIdentifier(s)).join(", ")}`
  const baseSQL = `
    FROM ${table}
    ${filterString}
  `
  const allowFilter = filters?.length > 0 ? ' ALLOW FILTERING' : ''

  const countSQL = `
    select count(*) as ${countTitle}
    ${baseSQL}
    ${_.isNumber(limit) ? `LIMIT ${limit}` : ''}
    ${_.isNumber(offset) ? `OFFSET ${offset}` : ""}
    ${allowFilter}
  `
  const sql = `
    ${selectSQL} ${baseSQL}
    ${_.isNumber(limit) ? `LIMIT ${limit}` : ''}
    ${_.isNumber(offset) ? `OFFSET ${offset}` : ""}
    ${allowFilter}
    `
  return {query: sql, countQuery: countSQL, params: filterParams}
}

async function selectTop(conn, table, offset, limit, orderBy, filters, keyspace, selects = ['*'], userOptions) {
  const version = await getVersion(conn)
  const { allowFilter } = userOptions
  const qs = buildSelectTopQueries({
    table, offset, limit, orderBy, filters, schema: keyspace, selects, allowFilter
  })

  const options = {
    prepare: true
  }

  if (limit) options.fetchSize = limit
  if (offset) options.pageState = offset

  const { data, fields, hasNext, pageState } = await driverExecuteQuery(conn, { query: qs.query, params: qs.params, options })

  return {
    result: data || [],
    fields: fields?.map(f => f.name) || [],
    hasNext: hasNext,
    pageState: pageState || null
  }
}

async function selectTopSql(conn, table, offset, limit, orderBy, filters, keyspace, selects = ['*'], userOptions = {}) {
  const version = await getVersion(conn)
  const { allowFilter } = userOptions
  const qs = buildSelectTopQueries({
    table, offset, limit, orderBy, filters, schema: keyspace, selects, allowFilter, inlineParams: true,
  })
  return qs.query
}

export function query(conn, queryText) {
  let pid = null;
  let canceling = false;
  const cancelable = createCancelablePromise({
    ...errors.CANCELED_BY_USER,
    sqlectronError: 'CANCELED_BY_USER',
  });

  return {
    async execute() {
      const queries = identifyCommands(queryText).map(query => executeQuery(conn, query.text))
      const retPromises = await Promise.all(queries)

      return retPromises.map(rp => rp[0])
    },

    // idk if this works. Should probably try it one day...
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

export function executeQuery(client, queryText) {
  const identification = identify(queryText, { strict: false, dialect: 'generic' })
  if( !isAllowedReadOnlyQuery(identification, dbReadOnlyMode) ){
    throw new Error(errorMessages.readOnly)
  }
  const commands = identifyCommands(queryText).map((item) => item.type);

  return new Promise((resolve, reject) => {
    client.execute(queryText, '', (err, data) => {
      if (err) return reject(err);

      resolve([parseRowQueryResult(data, commands[0])]);
    });
  });
}

export function executeSingleQuery(client, queryText) {
  const commands = identifyCommands(queryText).map((item) => item.type);

  return new Promise((resolve, reject) => {
    client.execute(queryText, '', (err, data) => {
      if (err) return reject(err);

      resolve(parseRowQueryResult(data, commands[0]));
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

export async function getTableCreateScript(client, schema, table) {
  const sql = `describe ${schema}.${table};`
  const [createScriptResult] = await executeQuery(client, sql)
  const [createScript] = createScriptResult.rows

  return createScript.create_statement
}

// TODO: Make sure this really isn't a thing in Cassandra. Pretty sure it isn't because nosql
// export function getViewCreateScript() {
//   // TODO: Get this working
//   return Promise.resolve('');
// }


export function getRoutineCreateScript() {
  return Promise.resolve([]);
}

export function wrapIdentifier(value) {
  if (value === '*') return value;
  const matched = value.match(/(.*?)(\[[0-9]\])/); // eslint-disable-line no-useless-escape
  if (matched) return wrapIdentifier(matched[1]) + matched[2];
  return `"${value.replace(/"/g, '\\"')}"`;
}

function fqTableName(table, keyspace) {
  return keyspace && keyspace.length ?
    `${wrapIdentifier(keyspace)}.${wrapIdentifier(table)}` :
    wrapIdentifier(table)
}


export const truncateAllTables = async (connection, database) => {
  const sql = `
    SELECT table_name
    FROM system_schema.tables
    WHERE keyspace_name = '${database}'
    ALLOW FILTERING;
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
}

function insertRows (rows) {
  return rows.map(row => {
    const [data] = row.data
    const columns = Object.keys(data)
    return {
      query: `INSERT INTO ${row.table} (${columns.join(', ')}) VALUES (${Array(columns.length).fill('?', 0, columns.length)})`,
      params: columns.map(c => data[c] || null)
    }
  })
}

function deleteRows (rows) {
  return rows.map(row => {
    const [data] = row.primaryKeys
    return {
      query: `DELETE FROM ${row.table} where ${wrapIdentifier(data.column)} = ?`,
      params: [data.value]
    }
  })
}

/**
 *
 * @param {Object} primaryKeys
 * @param {any|null} initialValue
 */
function getParamsAndWhereList (primaryKeys, initialValue = null) {
  const params = initialValue ? [initialValue] : []
  const whereList = []
  primaryKeys.forEach(({ column, value }) => {
    whereList.push(`${wrapIdentifier(column)} = ?`);
    params.push(value);
  })

  return [
    params,
    whereList
  ]
}

export async function getSelectUpdatedValues(conn, updates) {
  const updatePromises = updates.map(update => {
    const [updateParams, updateWhereList] = getParamsAndWhereList(update.primaryKeys)
    const query = `SELECT * FROM ${wrapIdentifier(update.table)} WHERE ${updateWhereList.join(' AND ')}`

    return driverExecuteQuery(conn, { query, params: updateParams })
  })

  const selectPromises = await Promise.all(updatePromises)

  return selectPromises.reduce((acc, sp) => {
    const [data] = sp.data
    if (data) acc.push(data)

    return acc
  }, [])
}

export async function updateValues(updates) {
  return updates.map(update => {
    const value = update.value
    const [updateParams, updateWhereList] = getParamsAndWhereList(update.primaryKeys, value)
    const where = updateWhereList.join(' AND ')
    return {
      query: `UPDATE ${wrapIdentifier(update.table)} SET ${wrapIdentifier(update.column)} = ? WHERE ${where}`,
      params: updateParams
    }
  })
}

export async function applyChanges(conn, changes) {
  let results = []
  let batchedChanges = []

  if (changes.inserts) {
    batchedChanges = [...batchedChanges, ...insertRows(changes.inserts)]
  }

  if (changes.updates) {
    batchedChanges = [...batchedChanges, ...await updateValues(changes.updates)]
  }

  if (changes.deletes) {
    batchedChanges = [...batchedChanges, ...deleteRows(changes.deletes)]
  }

  await driverExecuteBatch(conn, batchedChanges)

  if (changes.updates) {
    results = await getSelectUpdatedValues(conn, changes.updates)
  }

  return results
}

function configDatabase(server, database) {
  const { config: serverConfig } = server
  const config = {
    contactPoints: [serverConfig.host],
    protocolOptions: {
      port: serverConfig.port,
    },
    keyspace: database.database,
  };

  if (serverConfig?.cassandraOptions?.localDataCenter) {
    config.localDataCenter = serverConfig.cassandraOptions.localDataCenter
  }

  if (server.sshTunnel) {
    config.contactPoints = [serverConfig.localHost];
    config.protocolOptions.port = serverConfig.localPort;
  }

  if (serverConfig.ssl) {
    const sslOptions = {};

    if (serverConfig.sslCaFile) {
      sslOptions.ca = [readFileSync(serverConfig.sslCaFile)];
    }

    if (serverConfig.sslCertFile) {
      sslOptions.cert = readFileSync(serverConfig.sslCertFile);
    }

    if (serverConfig.sslKeyFile) {
      sslOptions.key = readFileSync(serverConfig.sslKeyFile);
    }

    config.sslOptions = sslOptions;
  }

  if (serverConfig.user && serverConfig.password) {
    const user = server.config.user;
    const password = server.config.password;
    const authProviderInfo = new cassandra.auth.PlainTextAuthProvider(user, password);
    config.authProvider = authProviderInfo;
  }

  return config;
}

function parseFields(fields, row) {
  return fields.map((field, idx) => {
    field.dataType = dataTypesToMatchTypeCode[field?.type?.code] || 'user-defined'
    field.id = field.name
    return field
  })
}


function parseRowQueryResult(data, command) {
  // Fallback in case the identifier could not recognize the command
  const isSelect = command ? command === 'SELECT' : Array.isArray(data.rows);
  const { columns, rows, rowLength } = data
  const fields = isSelect ? parseFields(columns, rows[0]) : []

  return {
    command: command || (isSelect && 'SELECT'),
    rows: rows || [],
    fields: fields,
    isPaged: data.isPaged(),
    rowCount: isSelect ? (rowLength || 0) : undefined,
    affectedRows: !isSelect && !isNaN(rowLength) ? rowLength : undefined,
  };
}

function identifyCommands(queryText) {
  try {
    return identify(queryText);
  } catch (err) {
    return [];
  }
}

/*
 * duplicateTable and duplicateTableSql need some work. Cassandra is silly.
 */
export async function duplicateTable(conn, tableName,  duplicateTableName) {
  const sql = duplicateTableSql(tableName, duplicateTableName)

  console.log(sql)

  await driverExecuteQuery(conn, { query: sql })
}

export function duplicateTableSql(tableName,  duplicateTableName) {
  console.log('~~~ DUPLICATE ~~~')
  console.log(tableName, duplicateTableName)
  const sql = `
    CREATE TABLE ${wrapIdentifier(duplicateTableName)} AS
    SELECT * FROM ${wrapIdentifier(tableName)}
  `

  return sql

}


export async function dropElement (conn, elementName, typeOfElement) {
    const sql = `DROP ${typeOfElement} ${wrapIdentifier(elementName)}`

    await driverExecuteQuery(conn, { query: sql })
}

export async function truncateElement (conn, elementName, typeOfElement) {
  const sql = `TRUNCATE ${typeOfElement} ${wrapIdentifier(elementName)}`

  await driverExecuteQuery(conn, { query: sql })
}

export async function getPrimaryKeys(conn, database, table) {
  logger().debug('finding primary keys for', database, table)
  const sql = `select * from system_schema.columns where table_name=? allow filtering;`
  const params = [
    table,
  ];
  const { data } = await driverExecuteQuery(conn, { query: sql, params })

  if (!data || data.length === 0) return []
  return data.reduce((acc, { column_name, kind, position }, ind) => {
    if (kind.includes('_key')) {
      acc.push({
        columnName: column_name,
        position
      })
    }
    return acc
  }, [])
}

export async function getTableProperties(conn, table) {
  const propsSql = `
  SELECT comment as description
  FROM system_schema.tables
  where table_name = ?
  allow filtering
  `

  const [
    tableInfo,
    relations
  ] =
  await Promise.all([
    driverExecuteQuery(conn, { query: propsSql, params: [ table ] }),
    getTableKeys(conn, null, table)
  ])

  const { data, length,  } = tableInfo
  const { description } = data

  return {
    description,
    length,
    relations,
    indexes: [], // indexes I believe are actually the primary keys
    triggers:[] // shouldn't have triggers
  }
}

async function alterTableSql(conn, change) {
  const columns = await listTableColumns(conn, null, change.table)
  const builder = new CassandraChangeBuilder(change.table, columns)
  return builder.alterTable(change)
}

async function alterTable(conn, change) {
  const queries = await alterTableSql(conn, change)
  // cannot use batch because that is just for deletes, update, and inserts, not Alters. Fun, I know
  const batchQueries = identify(queries).map(({text: query}) =>
     driverExecuteQuery(conn, { query })
  )

  return await Promise.all(batchQueries)
}

async function getInsertQuery(conn, database, tableInsert) {
  const columns = await listTableColumns(conn, database, tableInsert.table, tableInsert.schema)
  return buildInsertQuery(knex, tableInsert, columns)
}

async function getTableLength(conn, table) {
  // FIXME - should be able to fetch approximate table length
  return 'not implemented';
}

export async function getPrimaryKey(conn, database, table) {
  const res = await getPrimaryKeys(conn, database, table)
  return res.length === 1 ? res[0].columnName : null
}

async function getVersion(conn) {
  const data = await executeQuery(conn, 'select release_version from system.local;')
  const [response] = data
  const version = response?.rows[0]?.release_version

  if (!version) {
    return {
      versionString: '',
      version: '4.0.7'
    }
  }

  return {
    versionString: version,
    version
  }

}

function getVersionString(versionInfo) {
  return versionInfo.versionString
}

async function driverExecuteBatch(client, batchStatements) {
  logger().info(`Running a Batch update/delete/insert`)
  try {
    await client.batch(batchStatements, { prepare: true })
  } catch (err) {
    logger().error(err)
    throw err
  }
}

async function driverExecuteQuery(client, queryArgs) {
  const {query, params = [], options = { prepare: true }} = queryArgs
  logger().info(`Running Query`, query, params)
  const data = await client.execute(query, params, options)
  // console.log('~~~ driverExecuteQuery ~~~')
  // console.log(data)
  return {
    info: data.info,
    length: data.rowLength,
    data: data.rows,
    hasNext: data.isPaged(),
    pageState: data.pageState
  };
}
