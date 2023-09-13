import { errors } from '../../errors';
import * as bq from '@google-cloud/bigquery';
import { DatabaseClient, IDbConnectionServerConfig, DatabaseElement } from '../client'
import { FilterOptions, OrderBy, TableFilter, TableUpdateResult, TableResult, Routine, TableChanges, TableInsert, TableUpdate, TableDelete, DatabaseFilterOptions, SchemaFilterOptions, NgQueryResult, StreamResults, ExtendedTableColumn, PrimaryKeyColumn, TableIndex, IndexedColumn, } from "../models";


import rawLog from 'electron-log'
import { createCancelablePromise } from '@/common/utils';
import { BigQueryOptions } from '@/common/appdb/models/saved_connection';
import { table, time } from 'console';
import { data } from 'jquery';
import { buildDeleteQueries, buildInsertQueries, buildUpdateQueries, buildInsertQuery, genericSelectTop, buildSelectTopQuery, escapeString, joinQueries, escapeLiteral, applyChangesSql } from './utils';
import { wrapIdentifier } from './mysql';
import { BigQueryClient } from '@shared/lib/knex-bigquery';
import knexlib from 'knex';
const log = rawLog.scope('bigquery')
const logger = () => log

let knex;

/**
 * To keep compatibility with the other clients we treat dataset as database.
 */
export default async function (server, database) {
  let client = null
  logger().debug(`bigquery client creating `, server, ` database:`, database, ` config:`, server.config)
  const dbConfig = configDatabase(server, database)
  client = new bq.BigQuery(dbConfig)
  logger().debug('bigquery client created ', client)

  const apiEndpoint = dbConfig.host !== "" && dbConfig.port !== "" ? `http://${dbConfig.host}:${dbConfig.port}` : undefined;
  knex = knexlib({
        client: BigQueryClient,
        connection: {
          projectId: dbConfig.bigQueryOptions?.projectId,
          keyFilename: dbConfig.bigQueryOptions?.keyFilename,
          // for testing
          apiEndpoint
        }
      });

  // light solution to test connection with with a simple query
  const results = await driverExecuteQuery(client, { query: 'SELECT CURRENT_TIMESTAMP()' });
  logger().debug("bigquery client connected")

  return {
    supportedFeatures: () => ({ customRoutines: false, comments: false, properties: true, partitions: false, editPartitions: false }),
    defaultSchema: () => null,
    disconnect: () => disconnect(client),
    listTables: (db) => listTables(client, db),
    listViews: (filter) => listViews(client, database.database, filter),
    listMaterializedViews: () => Promise.resolve([]),
    listRoutines: () => Promise.resolve([]),
    listTableColumns: (db, table) => listTableColumns(client, db, table),
    getTableLength: (table) => getTableLength(client, database.database, table),
    selectTop: (table, offset, limit, orderBy, filters, schema, selects) => selectTop(client, database.database, table, offset, limit, orderBy, filters, selects),
    getTableKeys: (db, table) => getTableKeys(client, db, table),
    getPrimaryKey: (db, table) => getPrimaryKey(client, db, table),
    getPrimaryKeys: (db, table) => getPrimaryKeys(client, db, table),
    query: (queryText) => query(client, queryText),
    applyChanges: (changes) => applyChanges(client, changes),
    applyChangesSql: (changes) => applyChangesSql(changes, knex),
    executeQuery: (queryText) => driverExecuteQuery(client, queryText),
    listDatabases: () => listDatasets(client),
    getTableProperties: (table) => getTableProperties(client, database.database, table),
    versionString: () => getVersionString(),
    // db creation
    // TODO: determine if bigquery has different charsets
    listCharsets: () => [],
    getDefaultCharset: () => null,
    listCollations: (charset) => [],
    createDatabase: (databaseName) => createDatabase(client, databaseName),
  };
}


function configDatabase(server, database) {

  const host = server.config.host
  const port = server.config.port

  // For BigQuery Only -- IAM authentication and credential exchange
  const bigQueryOptions = server.config.bigQueryOptions
  const config = {}

  config.projectId = bigQueryOptions.projectId || server.config.projectId
  if (server.config.client === 'bigquery' && bigQueryOptions?.iamAuthenticationEnabled) {
    config.keyFilename = bigQueryOptions.keyFilename
  }
  // For testing purposes
  if (host !== "" && port !== "") {
    config.apiEndpoint = "http://" + host + ":" + port
    logger().debug(`configDatabase host: ${host} port: ${port} setting apiEndpoint: ${config.apiEndpoint}`)
  } // use default otherwise

  logger().debug("configDatabase config: ", config)
  return config
}

async function getTableKeys(conn, database, table) {
  const sql = `
    SELECT
      NULL as from_schema,
      f.table_name as from_table,
      f.column_name as from_column,
      NULL as to_schema,
      t.table_name as to_table,
      t.column_name as to_column,
      f.constraint_name,
      NULL as update_rule,
      NULL as delete_rule
    FROM
      ${wrapIdentifier(database)}.INFORMATION_SCHEMA.KEY_COLUMN_USAGE as f
    JOIN ${wrapIdentifier(database)}.INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE as t
    ON f.constraint_name = t.constraint_name
    JOIN ${wrapIdentifier(database)}.INFORMATION_SCHEMA.TABLE_CONSTRAINTS as con
    ON f.constraint_catalog = con.constraint_catalog
    AND f.constraint_schema = con.constraint_schema
    AND f.constraint_name = con.constraint_name
    WHERE f.table_schema = '${escapeString(database)}'
    AND f.table_name = '${escapeString(table)}'
    AND con.constraint_type = 'FOREIGN KEY'
  `;

  const data = await driverExecuteSingle(conn, { query: sql });
  console.log('DATA: ', data);

  return data.rows.map((row) => ({
    toTable: row.to_table,
    toSchema: row.to_schema,
    toColumn: row.to_column,
    fromTable: row.from_table,
    fromSchema: row.from_schema,
    fromColumn: row.from_column,
    constraintName: row.constraint_name,
    onUpdate: row.update_rule,
    onDelete: row.delete_rule
  }));
}

async function getPrimaryKey(conn, database, table) {
  const keys = await getPrimaryKeys(conn, database, table);
  return keys.length === 1 ? keys[0].columnName : null;
}

async function getPrimaryKeys(conn, database, table) {
  const query = `
    SELECT
      use.column_name as column_name,
      use.ordinal_position as position
    FROM
      ${wrapIdentifier(database)}.INFORMATION_SCHEMA.KEY_COLUMN_USAGE as use 
    JOIN ${wrapIdentifier(database)}.INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS con 
    ON use.constraint_catalog = con.constraint_catalog 
    AND use.constraint_schema = con.constraint_schema 
    AND use.constraint_name = con.constraint_name
    WHERE use.table_schema = '${escapeString(database)}'
    AND use.table_name = '${escapeString(table)}'
    AND con.constraint_type = 'PRIMARY KEY'`;

  const data = await driverExecuteSingle(conn, { query });
  if (data.rows) {
    return data.rows.map((r) => ({
      columnName: r.column_name,
      position: r.position
    }));
  } else {
    return []
  }
}

function query(client, queryText) {
  logger().debug('bigQuery query: ' + queryText)
  let job = null
  let canceling = false
  const cancelable = createCancelablePromise({
    ...errors.CANCELED_BY_USER,
    sqlectronError: 'CANCELED_BY_USER',
  })

  return {
    async execute() {
      // Get a query job first
      [job] = await client.createQueryJob({ query: queryText })
      logger().debug("created job: ", job.id)

      try {
        logger().debug("wait for executeQuery job.id: ", job.id)
        const data = await Promise.race([
          cancelable.wait(),
          driverExecuteQuery(client, queryText, job),
        ])
        return data
      } catch (err) {
        log.error('executeQuery error: ', err)
        throw err
      }
    },
    async cancel() {
      if (!job) {
        throw new Error('Query not ready to be canceled')
      }
      canceling = true
      try {
        const [jobCancelResponse] = await job.cancel()
        logger().debug("query jobCancelResponse: ", jobCancelResponse)
        cancelable.cancel()
      } catch (err) {
        canceling = false
        throw err
      } finally {
        canceling = false
        cancelable.discard()
      }
    },
  }
}

async function applyChanges(conn, changes) {
  let results = []

}


function getVersionString() {
  return null
}


function parseRowData(data) {
  // BigQuery can return nested objects with custom types in the results
  // look for the value string property.
  // https://github.com/googleapis/nodejs-bigquery/blob/71dbed2140893677f7af254f5a7713a7f50bae92/src/bigquery.ts#L2191
  return data.map((row) => {
    const parsedRow = {}
    Object.keys(row).forEach((key) => {
      let strValue = row[key]
      if (strValue != null && (Object.prototype.hasOwnProperty.call(strValue, 'value'))) {
        strValue = row[key].value
      }
      parsedRow[key] = strValue
    })
    return parsedRow
  })
}


function parseRowQueryResult(data) {
  // Fallback in case the identifier could not reconize the command
  const isSelect = Array.isArray(data)
  const rows = parseRowData(data) || []
  const fields = Object.keys(rows[0] || {}).map((name) => ({ name, id: name }))
  logger().debug("parseRowQueryResult data length: ", data.length)

  return {
    command: isSelect ? 'SELECT' : 'UNKNOWN',
    rows,
    fields: fields,
    rowCount: data && data.length,
    affectedRows: 0,
  }
}

async function driverExecuteSingle(conn, queries, job) {
  return (await driverExecuteQuery(conn, queries, job))[0];
}

async function driverExecuteQuery(client, queries, job) {
  // Support passing a single query string and an object with params
  if (queries instanceof String) {
    queries = { query: queries }
  }
  if (!job) {
    [job] = await client.createQueryJob(queries)
  }

  // Wait for the query to finish
  const results = await job.getQueryResults()
  return results.map(parseRowQueryResult)
}


export async function disconnect(client) {
  return Promise.resolve()
}


function ensureDbFullName(client, db) {
  if ((db.includes(`${client.projectId}.`)) || db.includes(`.${db}`)) {
    return db
  } else {
    return `${client.projectId}.${db}`
  }
}


async function listTablesOrViews(client, db, type) {
  // Lists all tables or views in the dataset
  const [tables] = await client.dataset(db).getTables()
  var data = tables.map((table) => ({ name: table.id, entityType: table.metadata.type, metadata: table.metadata, table: table }))
  data = data.filter((table) => table.metadata.type === type)
  logger().debug(`listTablesAndViews for type:${type} data: `, data)
  return data
}

export async function listTables(client, db) {
  // Lists all tables in the dataset
  const data = await listTablesOrViews(client, db, 'TABLE')
  return data
}


export async function listTableColumns(client, db, table) {
  // Lists all columns in a table
  const [metadata] = await client.dataset(db).table(table).getMetadata()
  const data = metadata.schema.fields.map((field) => ({ columnName: field.name, dataType: field.type }))
  return data
}


export async function getTableProperties(client, db, table) {
  logger().debug("getTableProperties: ", table)

  const [
    length,
    indexes,
    triggers, // BigQuery has no triggers
    relations
  ] = await Promise.all([
    getTableLength(client, db, table),
    null,
    null,
    getTableKeys(client, db, table)
  ])
  return {
    length, indexes, relations, triggers
  }
}


export async function getTableLength(client, db, table) {
  // Returns the number of rows in the table
  const [metadata] = await client.dataset(db).table(table).getMetadata()
  return Number(metadata.numRows)
}


export async function listTableIndexes(client, db, table) {
  return []
}


export async function listDatasets(client) {
  // Lists all datasets in current GCP project.
  const [datasets] = await client.getDatasets()
  const data = datasets.map((dataset) => dataset.id)
  return data
}

export async function selectTop(client, db, table, offset, limit, orderBy, filters, selects) {
  const columns = await listTableColumns(client, db, table)
  const bqTable = db + "." + table
  const queries = buildSelectTopQuery(bqTable, offset, limit, orderBy, filters, 'total', columns, selects)
  const queriesResult = await driverExecuteQuery(client, queries)
  const data = queriesResult[0]
  const rowCount = Number(data.rowCount)
  const fields = Object.keys(data.rows[0] || {})

  const result = {
    totalRows: rowCount,
    result: data.rows,
    fields: { fields }
  }
  return result
}


export async function listViews(client, db, filter) {
  // Lists all views in the dataset
  const data = await listTablesOrViews(client, db, 'VIEW')
  return data
}

export async function createDatabase(client, databaseName) {
  // Create a new dataset/database
  const options = {}
  const [dataset] = await client.createDataset(databaseName, options);
  logger().debug(`Dataset ${dataset.id} created.`);
}

