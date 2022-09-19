// Copyright (c) 2015 The SQLECTRON Team

import { readFileSync } from 'fs';
import { parse as bytesParse } from 'bytes'
import { ConnectionPool } from 'mssql';
import { identify } from 'sql-query-identifier';
import knexlib from 'knex'
import _, { defaults } from 'lodash';

import { buildDatabseFilter, buildDeleteQueries, buildInsertQuery, buildInsertQueries, buildSchemaFilter, buildSelectQueriesFromUpdates, buildUpdateQueries, escapeString, joinQueries, escapeLiteral } from './utils';
import logRaw from 'electron-log'
import { SqlServerCursor } from './sqlserver/SqlServerCursor';
import { SqlServerData } from '@shared/lib/dialects/sqlserver';
import { SqlServerChangeBuilder } from '@shared/lib/sql/change_builder/SqlServerChangeBuilder';
const log = logRaw.scope('sql-server')

const logger = () => log;
const D = SqlServerData
const defaultSchema = 'dbo'
const knex = knexlib({
  client: 'mssql'
})
const mmsqlErrors = {
  CANCELED: 'ECANCEL',
};

// NOTE:
// DO NOT USE CONCAT() in sql, not compatible with Sql Server <= 2008


export default async function (server, database) {
  const dbConfig = configDatabase(server, database);
  logger().debug('create driver client for mmsql with config %j', dbConfig);

  const conn = { dbConfig };

  // get version and test connection
  const version = await getVersion(conn);

  return {
    supportedFeatures: () => ({ customRoutines: true, comments: true, properties: true}),
    versionString: () => getVersionString(version),
    wrapIdentifier,
    disconnect: () => disconnect(conn),
    listTables: (db, filter) => listTables(conn, filter),
    listViews: (filter) => listViews(conn, filter),
    listMaterializedViews: (filter) => listMaterializedViews(conn, filter),
    listRoutines: (filter) => listRoutines(conn, filter),
    listTableColumns: (db, table, schema) => listTableColumns(conn, db, table, schema),
    listTableTriggers: (table, schema) => listTableTriggers(conn, table, schema),
    listTableIndexes: (db, table, schema) => listTableIndexes(conn, table, schema),
    listSchemas: () => listSchemas(conn),
    getTableReferences: (table) => getTableReferences(conn, table),
    getTableKeys: (db, table, schema) => getTableKeys(conn, db, table, schema),
    getPrimaryKey: (db, table, schema) => getPrimaryKey(conn, db, table, schema),
    getPrimaryKeys: (db, table, schema) => getPrimaryKeys(conn, db, table, schema),
    applyChanges: (changes) => applyChanges(conn, changes),
    query: (queryText) => query(conn, queryText),
    executeQuery: (queryText) => executeQuery(conn, queryText),
    listDatabases: (filter) => listDatabases(conn, filter),
    getTableLength: (table, schema) => getTableLength(conn, table, schema),
    selectTop: (table, offset, limit, orderBy, filters, schema, selects) => selectTop(conn, table, offset, limit, orderBy, filters, schema, selects),
    selectTopStream: (db, table, orderBy, filters, chunkSize, schema) => selectTopStream(conn, db, table, orderBy, filters, chunkSize, schema),
    getInsertQuery: (tableInsert) => getInsertQuery(conn, database.database, tableInsert),
    getQuerySelectTop: (table, limit) => getQuerySelectTop(conn, table, limit),
    getTableCreateScript: (table) => getTableCreateScript(conn, table),
    getViewCreateScript: (view) => getViewCreateScript(conn, view),
    getRoutineCreateScript: (routine) => getRoutineCreateScript(conn, routine),
    truncateAllTables: () => truncateAllTables(conn),
    getTableProperties: (table, schema) => getTableProperties(conn, table, schema),
    setTableDescription: (table, description, schema) => setTableDescription(conn, table, description, schema),
    // alter table
    alterTableSql: (change) => alterTableSql(conn, change),
    alterTable: (change) => alterTable(conn, change),


    // indexes
    alterIndexSql: (adds, drops) => alterIndexSql(adds, drops),
    alterIndex: (adds, drops) => alterIndex(conn, adds, drops),

    // relations
    alterRelationSql: (payload) => alterRelationSql(payload),
    alterRelation: (payload) => alterRelation(conn, payload),

    // remove things
    dropElement: (elementName, typeOfElement, schema) => dropElement(conn, elementName, typeOfElement, schema),
    truncateElement: (elementName, typeOfElement, schema) => truncateElement(conn, elementName, typeOfElement, schema)
  };
}

async function getVersion(conn) {
  const result = await driverExecuteQuery(conn, { query: "SELECT @@VERSION as version"})
  const versionString = result.data.recordset[0].version
  const yearRegex = /SQL Server (\d+)/g
  const yearResults = yearRegex.exec(versionString)
  const releaseYear = (yearResults && _.toNumber(yearResults[1])) || 2017
  return {
    supportOffsetFetch: releaseYear >= 2012,
    releaseYear,
    versionString
  }
}

function getVersionString(version) {
  return version.versionString.split(" \n\t")[0];
}

export async function disconnect(conn) {
  const connection = await new ConnectionPool(conn.dbConfig);
  connection.close();
}

function buildFilterString(filters) {
  let filterString = ""
  if (filters && filters.length > 0) {
    filterString = "WHERE " + filters.map((item) => {

      let wrappedValue = _.isArray(item.value) ?
        `(${item.value.map((v) => D.escapeString(v, true)).join(',')})` :
        D.escapeString(item.value, true)

      return `${wrapIdentifier(item.field)} ${item.type} ${wrappedValue}`
    }).join(" AND ")
  }
  return filterString
}

function genSelectOld(table, offset, limit, orderBy, filters, schema, selects) {
  const selectString = selects.map((s) => wrapIdentifier(s)).join(", ")
  const orderByString = genOrderByString(orderBy)
  const filterString = _.isString(filters) ? `WHERE ${filters}` : buildFilterString(filters)
  const lastRow = offset + limit
  const schemaString = schema ? `${wrapIdentifier(schema)}.` : ''

  const query = `
    WITH CTE AS
    (
        SELECT ${selectString}
              , ROW_NUMBER() OVER (${orderByString}) as RowNumber
        FROM ${schemaString}${wrapIdentifier(table)}
        ${filterString}
    )
    SELECT *
          -- get the total records so the web layer can work out
          -- how many pages there are
          , (SELECT COUNT(*) FROM CTE) AS TotalRecords
    FROM CTE
    WHERE RowNumber BETWEEN ${offset} AND ${lastRow}
    ORDER BY RowNumber ASC
  `
  return query
}

function genOrderByString(orderBy) {
  if (!orderBy) return ""

  let orderByString = "ORDER BY (SELECT NULL)"
  if (orderBy && orderBy.length > 0) {
    orderByString = "order by " + (orderBy.map((item) => {
      if (_.isObject(item)) {
        return `${wrapIdentifier(item.field)} ${item.dir}`
      } else {
        return wrapIdentifier(item)
      }
    })).join(",")
  }
  return orderByString
}

function genCountQuery(table, filters, schema) {
  const filterString = _.isString(filters) ? `WHERE ${filters}` : buildFilterString(filters)

  const schemaString = schema ? `${wrapIdentifier(schema)}.` : ''

  let baseSQL = `
   FROM ${schemaString}${wrapIdentifier(table)}
   ${filterString}
  `
  let countQuery = `
    select count(*) as total ${baseSQL}
  `
  return countQuery
}

function genSelectNew(table, offset, limit, orderBy, filters, schema, selects) {
  const filterString = _.isString(filters) ? `WHERE ${filters}` : buildFilterString(filters)

  const orderByString = genOrderByString(orderBy)
  const schemaString = schema ? `${wrapIdentifier(schema)}.` : ''

  const selectSQL = `SELECT ${selects.map((s) => wrapIdentifier(s)).join(", ")}`
  let baseSQL = `
    FROM ${schemaString}${wrapIdentifier(table)}
    ${filterString}
  `

  const offsetString = (_.isNumber(offset) && _.isNumber(limit)) ?
    `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY` : ''


  let query = `
    ${selectSQL} ${baseSQL}
    ${orderByString}
    ${offsetString}
    `
    return query
}

async function getTableLength(conn, table, schema) {
  const countQuery = genCountQuery(table, [], schema)
  const countResults = await driverExecuteQuery(conn, { query: countQuery})
  const rowWithTotal = countResults.data.recordset.find((row) => { return row.total })
  const totalRecords = rowWithTotal ? rowWithTotal.total : 0
  return totalRecords
}

export async function selectTop(conn, table, offset, limit, orderBy, filters, schema, selects = ['*']) {
  log.debug("filters", filters)
  const version = await getVersion(conn);
  const query = version.supportOffsetFetch ?
    genSelectNew(table, offset, limit, orderBy, filters, schema, selects) :
    genSelectOld(table, offset, limit, orderBy, filters, schema, selects)
  logger().debug(query)

  const result = await driverExecuteQuery(conn, { query })
  logger().debug(result)
  return {
    result: result.data.recordset,
    fields: Object.keys(result.data.recordset[0] || {})
  }
}

export async function selectTopStream(conn, db, table, orderBy, filters, chunkSize, schema, selects = ['*']) {
  const version = await getVersion(conn);
  // no limit or offset, so don't need the old version of paging
  const query = genSelectNew(table, null, null, orderBy, filters, schema, selects);
  const columns = await listTableColumns(conn, db, table);
  const rowCount = await getTableLength(conn, table, filters);

  return {
    totalRows: Number(rowCount),
    columns,
    cursor: new SqlServerCursor(conn, query, chunkSize)
  }
}


export function wrapIdentifier(value) {
  if (_.isString(value)) {
    return (value !== '*' ? `[${value.replace(/\[/g, '[')}]` : '*');
  } return value

}

export function wrapValue(value) {
  return `'${value.replaceAll(/'/g, "''")}'`
}

async function getInsertQuery(conn, database, tableInsert) {
  const columns = await listTableColumns(conn, database, tableInsert.table, tableInsert.schema)
  return buildInsertQuery(knex, tableInsert, columns)
}

export function getQuerySelectTop(client, table, limit) {
  return `SELECT TOP ${limit} * FROM ${wrapIdentifier(table)}`;
}

export function query(conn, queryText) {
  let queryRequest = null;

  return {
    execute() {
      return runWithConnection(conn, async (connection) => {
        const request = connection.request();
        request.multiple = true;
        request.arrayRowMode = true

        try {
          const promiseQuery = request.query(queryText);

          queryRequest = request;

          const data = await promiseQuery;
          const commands = identifyCommands(queryText).map((item) => item.type);

          // Executing only non select queries will not return results.
          // So we "fake" there is at least one result.
          const rowsAffected = _.sum(data.rowsAffected)
          const results = !data.recordsets.length && rowsAffected > 0 ? [[]] : data.recordsets;

          return results.map((r, idx) => parseRowQueryResult(r, rowsAffected, commands[idx], data.columns[idx], true));
        } catch (err) {
          if (err.code === mmsqlErrors.CANCELED) {
            err.sqlectronError = 'CANCELED_BY_USER';
          }

          throw err;
        }
      });
    },

    async cancel() {
      if (!queryRequest) {
        throw new Error('Query not ready to be canceled');
      }

      queryRequest.cancel();
    },
  };
}


export async function executeQuery(conn, queryText, arrayRowMode = false) {
  const { data, rowsAffected } = await driverExecuteQuery(conn, { query: queryText, multiple: true }, arrayRowMode);

  const commands = identifyCommands(queryText).map((item) => item.type);

  // Executing only non select queries will not return results.
  // So we "fake" there is at least one result.
  const results = !data.recordsets.length && rowsAffected > 0 ? [[]] : data.recordsets;

  return results.map((_, idx) => parseRowQueryResult(results[idx], rowsAffected, commands[idx], arrayRowMode));
}


async function getSchema(conn) {
  const sql = 'SELECT schema_name() AS \'schema\'';

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordsets[0].schema;
}


export async function listTables(conn, filter) {
  const schemaFilter = buildSchemaFilter(filter, 'table_schema');
  const sql = `
    SELECT
      table_schema,
      table_name
    FROM INFORMATION_SCHEMA.TABLES
    WHERE table_type NOT LIKE '%VIEW%'
    ${schemaFilter ? `AND ${schemaFilter}` : ''}
    ORDER BY table_schema, table_name
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((item) => ({
    schema: item.table_schema,
    name: item.table_name,
  }));
}

export async function listViews(conn, filter) {
  const schemaFilter = buildSchemaFilter(filter, 'table_schema');
  const sql = `
    SELECT
      table_schema,
      table_name
    FROM INFORMATION_SCHEMA.VIEWS
    ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
    ORDER BY table_schema, table_name
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((item) => ({
    schema: item.table_schema,
    name: item.table_name,
  }));
}

export async function listMaterializedViews() {
  // const schemaFilter = buildSchemaFilter(filter, '')
  // TODO: materialized vies in SQL server
  return []
}

export async function listRoutines(conn, filter) {
  const schemaFilter = buildSchemaFilter(filter, 'r.routine_schema');
  const sql = `
    SELECT
      r.specific_name as id,
      r.routine_schema as routine_schema,
      r.routine_name as name,
      r.routine_type as routine_type,
      r.data_type as data_type
    FROM INFORMATION_SCHEMA.ROUTINES r
    where r.routine_schema not in ('sys', 'information_schema',
                                'mysql', 'performance_schema', 'INFORMATION_SCHEMA')
    ${schemaFilter ? `AND ${schemaFilter}` : ''}
    ORDER BY routine_schema, routine_name
  `;

  const paramsSQL = `
    select
        r.routine_schema as routine_schema,
        r.specific_name as specific_name,
        p.parameter_name as parameter_name,
        p.character_maximum_length as char_length,
        p.data_type as data_type
  from INFORMATION_SCHEMA.ROUTINES r
  left join INFORMATION_SCHEMA.PARAMETERS p
            on p.specific_schema = r.routine_schema
            and p.specific_name = r.specific_name
  where r.routine_schema not in ('sys', 'information_schema',
                                'mysql', 'performance_schema', 'INFORMATION_SCHEMA')
    ${schemaFilter ? `AND ${schemaFilter}` : ''}

      AND p.parameter_mode = 'IN'
  order by r.routine_schema,
          r.specific_name,
          p.ordinal_position;

  `

  const { data } = await driverExecuteQuery(conn, { query: sql });
  const paramsResult = await driverExecuteQuery(conn, { query: paramsSQL })
  const grouped = _.groupBy(paramsResult.data.recordset, 'specific_name')

  return data.recordset.map((row) => {
    const params = grouped[row.id] || []
    return {
      schema: row.routine_schema,
      name: row.name,
      type: row.routine_type ? row.routine_type.toLowerCase() : 'function',
      returnType: row.data_type,
      id: row.id,
      routineParams: params.map((p) => {
        return {
          name: p.parameter_name,
          type: p.data_type,
          length: p.char_length || undefined
        }
      })
    }
  });
}

export async function listTableColumns(conn, database, table, schema) {
  const clauses = []
  if (table) clauses.push(`table_name = ${D.escapeString(table, true)}`)
  if (schema) clauses.push(`table_schema = ${D.escapeString(schema, true)}`)
  const clause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ''
  const sql = `
    SELECT
      table_schema as "table_schema",
      table_name as "table_name",
      column_name as "column_name",
      data_type as "data_type",
      ordinal_position as "ordinal_position",
      column_default as "column_default",
      is_nullable as "is_nullable",
      CASE
        WHEN character_maximum_length is not null AND data_type != 'text'
          THEN character_maximum_length
        WHEN datetime_precision is not null THEN
          datetime_precision
        ELSE null
      END as length
    FROM INFORMATION_SCHEMA.COLUMNS
    ${clause}
    ORDER BY table_schema, table_name, ordinal_position
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => ({
    schemaName: row.table_schema,
    tableName: row.table_name,
    columnName: row.column_name,
    dataType: row.length ? `${row.data_type}(${row.length})` : row.data_type,
    ordinalPosition: Number(row.ordinal_position),
    nullable: row.is_nullable === 'YES',
    defaultValue: row.column_default
  }));
}

export async function listTableTriggers(conn, table, schema) {
  // SQL Server does not have information_schema for triggers, so other way around
  // is using sp_helptrigger stored procedure to fetch triggers related to table
  const sql = `EXEC sp_helptrigger '${escapeString(schema)}.${escapeString(table)}'`;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => {
    const update = row.isupdate === 1 ? 'UPDATE' : null
    const del = row.isdelete === 1 ? 'DELETE': null
    const insert = row.isinsert === 1 ? 'INSERT' : null
    const instead = row.isinsteadof === 1 ? 'INSEAD_OF' : null

    const manips = [update, del, insert, instead].filter((f) => f).join(", ")

    return {
      name: row.trigger_name,
      timing: row.isafter === 1 ? 'AFTER' : 'BEFORE',
      manipulation: manips,
      action: null,
      condition: null,
      table, schema

    }
  })
}

export async function listTableIndexes(conn, table, schema = defaultSchema) {

  const sql = `

    SELECT

    t.name as table_name,
    s.name as schema_name,
    ind.name as index_name,
    ind.index_id as index_id,
    ic.index_column_id as column_id,
    col.name as column_name,
    ic.is_descending_key as is_descending,
    ind.is_unique as is_unique,
    ind.is_primary_key as is_primary

    FROM
        sys.indexes ind
    INNER JOIN
        sys.index_columns ic ON  ind.object_id = ic.object_id and ind.index_id = ic.index_id
    INNER JOIN
        sys.columns col ON ic.object_id = col.object_id and ic.column_id = col.column_id
    INNER JOIN
        sys.tables t ON ind.object_id = t.object_id
    INNER JOIN
        sys.schemas s on t.schema_id = s.schema_id
    WHERE
        ind.is_unique_constraint = 0
        AND t.is_ms_shipped = 0
        AND t.name = '${escapeString(table)}'
        AND s.name = '${escapeString(schema)}'
    ORDER BY
        t.name, ind.name, ind.index_id, ic.is_included_column, ic.key_ordinal;


  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  const grouped = _.groupBy(data.recordset, 'index_name')

  const result = Object.keys(grouped).map((indexName) => {
    const blob = grouped[indexName]
    const unique = blob[0].is_unique
    const id = blob[0].index_id
    const primary = blob[0].is_primary
    const columns = _.sortBy(blob, 'column_id').map((column) => {
      return {
        name: column.column_name,
        order: column.is_descending ? 'DESC' : 'ASC'
      }
    })
    return {
      table, schema, id, name: indexName, unique, primary, columns
    }
  })
  return _.sortBy(result, 'id')

}

export async function listSchemas(conn, filter) {
  const schemaFilter = buildSchemaFilter(filter);
  const sql = `
    SELECT schema_name
    FROM INFORMATION_SCHEMA.SCHEMATA
    ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
    ORDER BY schema_name
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => row.schema_name);
}

export async function listDatabases(conn, filter) {
  const databaseFilter = buildDatabseFilter(filter, 'name');
  const sql = `
    SELECT name
    FROM sys.databases
    ${databaseFilter ? `AND ${databaseFilter}` : ''}
    ORDER BY name
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => row.name);
}

export async function getTableReferences(conn, table) {
  const sql = `
    SELECT OBJECT_NAME(referenced_object_id) referenced_table_name
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID('${table}')
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => row.referenced_table_name);
}

export async function getTableKeys(conn, database, table, schema) {
  const sql = `
    SELECT
        name = FK.CONSTRAINT_NAME,
        from_schema = PK.TABLE_SCHEMA,
        from_table = FK.TABLE_NAME,
        from_column = CU.COLUMN_NAME,
        to_schema = PK.TABLE_SCHEMA,
        to_table = PK.TABLE_NAME,
        to_column = PT.COLUMN_NAME,
        constraint_name = C.CONSTRAINT_NAME,
        on_update = C.UPDATE_RULE,
        on_delete = C.DELETE_RULE
    FROM
        INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS C
    INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS FK
        ON C.CONSTRAINT_NAME = FK.CONSTRAINT_NAME
    INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS PK
        ON C.UNIQUE_CONSTRAINT_NAME = PK.CONSTRAINT_NAME
    INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE CU
        ON C.CONSTRAINT_NAME = CU.CONSTRAINT_NAME
    INNER JOIN (
                SELECT
                    i1.TABLE_NAME,
                    i2.COLUMN_NAME
                FROM
                    INFORMATION_SCHEMA.TABLE_CONSTRAINTS i1
                INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE i2
                    ON i1.CONSTRAINT_NAME = i2.CONSTRAINT_NAME
                WHERE
                    i1.CONSTRAINT_TYPE = 'PRIMARY KEY'
              ) PT
        ON PT.TABLE_NAME = PK.TABLE_NAME

    WHERE FK.TABLE_NAME = ${wrapValue(table)} AND FK.TABLE_SCHEMA =${wrapValue(schema)}
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  const result = data.recordset.map((row) => ({
    constraintName: row.name,
    toTable: row.to_table,
    toColumn: row.to_column,
    toSchema: row.to_schema,
    fromSchema: row.from_schema,
    fromTable: row.from_table,
    fromColumn: row.from_column,
    onUpdate: row.on_update,
    onDelete: row.on_delete
  }));
  log.debug("tableKeys result", result)
  return result
}

export async function getPrimaryKeys(conn, database, table, schema) {
  logger().debug('finding foreign key for', database, table)
  const sql = `
  SELECT COLUMN_NAME, ORDINAL_POSITION
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + QUOTENAME(CONSTRAINT_NAME)), 'IsPrimaryKey') = 1
  AND TABLE_NAME = ${wrapValue(table)} AND TABLE_SCHEMA = ${wrapValue(schema)}
  `
  const { data } = await driverExecuteQuery(conn, { query: sql})
  if (!data.recordset || data.recordset.length === 0) return []

  return data.recordset.map((r) => ({
    columnName: r.COLUMN_NAME,
    position: r.ORDINAL_POSITION
  }))
}

export async function getPrimaryKey(conn, database, table, schema) {
  const res = await getPrimaryKeys(conn, database, table, schema)
  return res.length === 1 ? res[0].columnName : null
}

export async function applyChanges(conn, changes) {
  let results = []
  let sql = ['SET XACT_ABORT ON', 'BEGIN TRANSACTION']

  await runWithConnection(conn, async (connection) => {
    const cli = { connection }

    try {
      if (changes.inserts) {
        sql = sql.concat(buildInsertQueries(knex, changes.inserts))
      }

      if (changes.updates) {
        sql = sql.concat(buildUpdateQueries(knex, changes.updates))
      }

      if (changes.deletes) {
        sql = sql.concat(buildDeleteQueries(knex, changes.deletes))
      }

      sql.push('COMMIT')

      await driverExecuteQuery(cli, { query: sql.join(';')})

      if (changes.updates) {
        const selectQueries = buildSelectQueriesFromUpdates(knex, changes.updates)
        for (let index = 0; index < selectQueries.length; index++) {
          const element = selectQueries[index];
          const r = await driverExecuteQuery(cli, element)
          if (r.data[0]) results.push(r.data[0])
        }
      }
    } catch (ex) {
      log.error("query exception: ", ex)
      throw ex
    }
  })

  return results
}

export async function getTableCreateScript(conn, table) {
  // Reference http://stackoverflow.com/a/317864
  const sql = `
    SELECT  ('CREATE TABLE ' + so.name + ' (' +
      CHAR(13)+CHAR(10) + REPLACE(o.list, '&#x0D;', CHAR(13)) +
      ')' + CHAR(13)+CHAR(10) +
      CASE WHEN tc.constraint_name IS NULL THEN ''
           ELSE + CHAR(13)+CHAR(10) + 'ALTER TABLE ' + so.Name +
           ' ADD CONSTRAINT ' + tc.constraint_name  +
           ' PRIMARY KEY ' + '(' + LEFT(j.list, Len(j.list)-1) + ')'
      END) AS createtable
    FROM sysobjects so
    CROSS APPLY
      (SELECT
        '  ' + column_name + ' ' +
        data_type +
        CASE data_type
            WHEN 'sql_variant' THEN ''
            WHEN 'text' THEN ''
            WHEN 'ntext' THEN ''
            WHEN 'xml' THEN ''
            WHEN 'decimal' THEN '(' + cast(numeric_precision AS varchar) + ', '
                  + cast(numeric_scale AS varchar) + ')'
            ELSE coalesce('('+ CASE WHEN character_maximum_length = -1
                  THEN 'MAX'
                  ELSE cast(character_maximum_length AS varchar)
                END + ')','')
          END + ' ' +
          CASE WHEN EXISTS (
            SELECT id FROM syscolumns
            WHERE object_name(id)=so.name
            AND name=column_name
            AND columnproperty(id,name,'IsIdentity') = 1
          ) THEN
            'IDENTITY(' +
            cast(ident_seed(so.name) AS varchar) + ',' +
            cast(ident_incr(so.name) AS varchar) + ')'
          ELSE ''
          END + ' ' +
           (CASE WHEN UPPER(IS_NULLABLE) = 'NO'
                 THEN 'NOT '
                 ELSE ''
          END ) + 'NULL' +
          CASE WHEN INFORMATION_SCHEMA.COLUMNS.column_default IS NOT NULL
               THEN 'DEFAULT '+ INFORMATION_SCHEMA.COLUMNS.column_default
               ELSE ''
          END + ',' + CHAR(13)+CHAR(10)
       FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = so.name
       ORDER BY ordinal_position
       FOR XML PATH('')
    ) o (list)
    LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON  tc.table_name       = so.name
    AND tc.constraint_type  = 'PRIMARY KEY'
    CROSS APPLY
        (SELECT column_name + ', '
         FROM   INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
         WHERE  kcu.constraint_name = tc.constraint_name
         ORDER BY ordinal_position
         FOR XML PATH('')
        ) j (list)
    WHERE   xtype = 'U'
    AND name    NOT IN ('dtproperties')
    AND so.name = '${table}'
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => row.createtable);
}

export async function getViewCreateScript(conn, view) {
  const sql = `SELECT OBJECT_DEFINITION (OBJECT_ID('${view}')) AS ViewDefinition;`;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => row.ViewDefinition);
}

export async function getRoutineCreateScript(conn, routine) {
  const sql = `
    SELECT routine_definition
    FROM INFORMATION_SCHEMA.ROUTINES
    WHERE routine_name = '${routine}'
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => row.routine_definition);
}

export async function truncateAllTables(conn) {
  await runWithConnection(conn, async (connection) => {
    const connClient = { connection };
    const schema = await getSchema(connClient);

    const sql = `
      SELECT table_name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE table_schema = '${schema}'
      AND table_type NOT LIKE '%VIEW%'
    `;

    const { data } = await driverExecuteQuery(connClient, { query: sql });

    const truncateAll = data.recordset.map((row) => `
      DELETE FROM ${wrapIdentifier(schema)}.${wrapIdentifier(row.table_name)}
      DBCC CHECKIDENT ('${schema}.${row.table_name}', RESEED, 0);
    `).join('');

    await driverExecuteQuery(connClient, { query: truncateAll, multiple: true });
  });
}

export async function dropElement (conn, elementName, typeOfElement, schema = 'dbo') {
  await runWithConnection(conn, async (connection) => {
    const connClient = { connection };
    const sql = `DROP ${D.wrapLiteral(typeOfElement)} ${wrapIdentifier(schema)}.${wrapIdentifier(elementName)}`

    await driverExecuteQuery(connClient, { query: sql })
  });
}

export async function truncateElement (conn, elementName, typeOfElement, schema = 'dbo') {
  await runWithConnection(conn, async (connection) => {
    const connClient = { connection };
    const sql = `TRUNCATE ${D.wrapLiteral(typeOfElement)} ${wrapIdentifier(schema)}.${wrapIdentifier(elementName)}`

    await driverExecuteQuery(connClient, { query: sql })
  });
}

async function getTableDescription(conn, table, schema = defaultSchema) {
  const query = `SELECT *
    FROM fn_listextendedproperty (
      'MS_Description',
      'schema',
      '${escapeString(schema)}',
      'table',
      '${escapeString(table)}',
      default,
    default);
  `
  const data = await driverExecuteQuery(conn, { query })
  if (!data || !data.recordset || data.recordset.length === 0) {
    return null
  }
  return data.recordset[0].MS_Description
}

export async function getTableProperties(conn, table, schema = defaultSchema) {

  const triggers = await listTableTriggers(conn, table, schema)
  const indexes = await listTableIndexes(conn, table, schema)

  const description = await getTableDescription(conn, table, schema)
  const sizeQuery = `EXEC sp_spaceused N'${escapeString(schema)}.${escapeString(table)}'; `
  const { data }  = await driverExecuteQuery(conn, { query: sizeQuery })
  const row = data.recordset ? data.recordset[0] || {} : {}
  const relations = await getTableKeys(conn, null, table, schema)
  return {
    size: bytesParse(row.data),
    indexSize: bytesParse(row.index_size),
    length: Number(row.rows),
    triggers,
    indexes,
    description,
    relations
  }
}

export async function setTableDescription(conn, table, desc, schema) {
  const existingDescription = await getTableDescription(conn, table, schema)
  const f = existingDescription ? 'sp_updateextendedproperty' : 'sp_addextendedproperty'
  const sql = `
  EXEC ${f}
    @name = N'MS_Description',
    @value = N${D.escapeString(desc, true)},
    @level0type = N'SCHEMA', @level0name = ${D.wrapIdentifier(schema)},
    @level1type = N'TABLE',  @level1name = ${D.wrapIdentifier(table)};
  `
}

async function listDefaultConstraints(conn, table, schema) {
  const sql = `
-- returns name of a column's default value constraint
SELECT
    all_columns.name as columnName,
    tables.name as tableName,
    schemas.name as schemaName,
    default_constraints.name as name
FROM
    sys.all_columns

        INNER JOIN
    sys.tables
        ON all_columns.object_id = tables.object_id

        INNER JOIN
    sys.schemas
        ON tables.schema_id = schemas.schema_id

        INNER JOIN
    sys.default_constraints
        ON all_columns.default_object_id = default_constraints.object_id

WHERE
        schemas.name = ${D.escapeString(schema || defaultSchema, true)}
    AND tables.name = ${D.escapeString(table, true)}

  `
  const { data } = await driverExecuteQuery(conn, { query: sql})
  return data.recordset.map((d) => {
    return {
      column: d.columnName,
      table: d.tableName,
      schema: d.schemaName,
      name: d.name
    }
  })
}

async function alterTableSql(conn, changes) {
  const { table, schema } = changes
  const columns = await listTableColumns(conn, null, table, schema)
  const defaultConstraints = await listDefaultConstraints(conn, table, schema)
  const builder = new SqlServerChangeBuilder(table, schema, columns, defaultConstraints)
  return builder.alterTable(changes)
}

async function alterTable(conn, changes) {
  const query = await alterTableSql(conn, changes)
  await executeWithTransaction(conn, { query })
}


export function alterIndexSql(payload) {
  const { table, schema, additions, drops } = payload
  const changeBuilder = new SqlServerChangeBuilder(table, schema, [], [])
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
  const builder = new SqlServerChangeBuilder(table, schema, [], [])
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
    user: server.config.user,
    password: server.config.password,
    server: server.config.host,
    database: database.database,
    port: server.config.port,
    requestTimeout: Infinity,
    appName: server.config.applicationName || 'beekeeperstudio',
    pool: {
      max: 10,
    }
  };
  if (server.config.domain) {
    config.domain = server.config.domain
  }

  if (server.sshTunnel) {
    config.server = server.config.localHost;
    config.port = server.config.localPort;
  }

  config.options = { trustServerCertificate: server.config.trustServerCertificate }

  if (server.config.ssl) {
    const options = {
      encrypt: server.config.ssl,
      cryptoCredentialsDetails: {}
    }

    if (server.config.sslCaFile) {
      options.cryptoCredentialsDetails.ca = readFileSync(server.config.sslCaFile);
    }

    if (server.config.sslCertFile) {
      options.cryptoCredentialsDetails.cert = readFileSync(server.config.sslCertFile);
    }

    if (server.config.sslKeyFile) {
      options.cryptoCredentialsDetails.key = readFileSync(server.config.sslKeyFile);
    }


    if (server.config.sslCaFile && server.config.sslCertFile && server.config.sslKeyFile) {
      // trust = !reject
      // mssql driver reverses this setting for no obvious reason
      // other drivers simply pass through to the SSL library.
      options.trustServerCertificate = !server.config.sslRejectUnauthorized
    }

    config.options = options;
  }

  return config;
}

function parseFields(data, columns) {
  if (columns) {
    return columns.map((c, idx) => {
      return {
        id: `c${idx}`,
        name: c.name
      }
    })
  } else {
    return Object.keys(data[0] || {}).map((name) => ({ name, id: name }))
  }
}

function parseRowQueryResult(data, rowsAffected, command, columns, arrayRowMode = false) {
  // Fallback in case the identifier could not reconize the command
  const isSelect = !!(data.length || rowsAffected === 0);
  const fields = parseFields(data, columns)
  const fieldIds = fields.map(f => f.id)
  return {
    command: command || (isSelect && 'SELECT'),
    rows: arrayRowMode ? data.map(r => _.zipObject(fieldIds, r)) : data,
    fields: fields,
    rowCount: data.length,
    affectedRows: rowsAffected,
  };
}


function identifyCommands(queryText) {
  try {
    return identify(queryText);
  } catch (err) {
    return [];
  }
}

export async function driverExecuteQuery(conn, queryArgs, arrayRowMode = false) {
  logger().info('RUNNING', queryArgs)
  const runQuery = async (connection) => {
    const request = connection.request();
    request.arrayRowMode = arrayRowMode
    const data = await request.query(queryArgs.query)
    const rowsAffected = _.sum(data.rowsAffected);
    return { request, data, rowsAffected };
  };

  return conn.connection
    ? runQuery(conn.connection)
    : runWithConnection(conn, runQuery);
}

async function runWithConnection(conn, run) {
  const connection = await new ConnectionPool(conn.dbConfig).connect();
  conn.connection = connection
  return run(connection);
}

async function executeWithTransaction(conn, queryArgs) {
  try {
    const query = joinQueries(['SET XACT_ABORT ON', 'BEGIN TRANSACTION', queryArgs.query, 'COMMIT'])
    await driverExecuteQuery(conn, { ...queryArgs, query })
  } catch (ex) {
    log.error(ex)
    throw ex
  }
}


export const sqlServerTestOnly = {
  alterTableSql
}
