// Copyright (c) 2015 The SQLECTRON Team

import { readFileSync } from 'fs';

import { ConnectionPool } from 'mssql';
import { identify } from 'sql-query-identifier';
import knexlib from 'knex'
import _ from 'lodash';

import { buildDatabseFilter, buildDeleteQueries, buildInsertQueries, buildSchemaFilter, buildSelectQueriesFromUpdates, buildUpdateQueries } from './utils';
import logRaw from 'electron-log'
const log = logRaw.scope('sql-server')

const logger = () => log;
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

  // light solution to test connection with with the server
  await driverExecuteQuery(conn, { query: 'SELECT 1' });

  return {
    supportedFeatures: () => ({ customRoutines: true}),
    wrapIdentifier,
    disconnect: () => disconnect(conn),
    listTables: (db, filter) => listTables(conn, filter),
    listViews: (filter) => listViews(conn, filter),
    listMaterializedViews: (filter) => listMaterializedViews(conn, filter),
    listRoutines: (filter) => listRoutines(conn, filter),
    listTableColumns: (db, table) => listTableColumns(conn, db, table),
    listTableTriggers: (table) => listTableTriggers(conn, table),
    listTableIndexes: (db, table) => listTableIndexes(conn, db, table),
    listSchemas: () => listSchemas(conn),
    getTableReferences: (table) => getTableReferences(conn, table),
    getTableKeys: (db, table, schema) => getTableKeys(conn, db, table, schema),
    getPrimaryKey: (db, table, schema) => getPrimaryKey(conn, db, table, schema),
    applyChanges: (changes) => applyChanges(conn, changes),
    query: (queryText) => query(conn, queryText),
    executeQuery: (queryText) => executeQuery(conn, queryText),
    listDatabases: (filter) => listDatabases(conn, filter),
    selectTop: (table, offset, limit, orderBy, filters, schema) => selectTop(conn, table, offset, limit, orderBy, filters, schema),
    getQuerySelectTop: (table, limit) => getQuerySelectTop(conn, table, limit),
    getTableCreateScript: (table) => getTableCreateScript(conn, table),
    getViewCreateScript: (view) => getViewCreateScript(conn, view),
    getRoutineCreateScript: (routine) => getRoutineCreateScript(conn, routine),
    truncateAllTables: () => truncateAllTables(conn),
  };
}


export async function disconnect(conn) {
  const connection = await new ConnectionPool(conn.dbConfig);
  connection.close();
}

function buildFilterString(filters) {
  let filterString = ""
  if (filters && filters.length > 0) {
    filterString = "WHERE " + filters.map((item) => {
      return `${wrapIdentifier(item.field)} ${item.type} '${item.value}'`
    }).join(" AND ")
  }
  return filterString
}

export async function selectTop(conn, table, offset, limit, orderBy, filters, schema) {
  let orderByString = "ORDER BY (SELECT NULL)"
  log.debug("filters", filters)
  const filterString = _.isString(filters) ? `WHERE ${filters}` : buildFilterString(filters)
  if (orderBy && orderBy.length > 0) {
    orderByString = "order by " + (orderBy.map((item) => {
      if (_.isObject(item)) {
        return `${wrapIdentifier(item.field)} ${item.dir}`
      } else {
        return wrapIdentifier(item)
      }
    })).join(",")
  }

  let baseSQL = `
    FROM ${wrapIdentifier(schema)}.${wrapIdentifier(table)}
    ${filterString}
  `
  let countQuery = `
    select count(*) as total ${baseSQL}
  `
  logger().debug(countQuery)

  let query = `
    SELECT * ${baseSQL}
    ${orderByString}
    OFFSET ${offset} ROWS
    FETCH NEXT ${limit} ROWS ONLY
    `
  logger().debug(query)
  const countResults = await driverExecuteQuery(conn, { query: countQuery})
  const result = await driverExecuteQuery(conn, { query })
  logger().debug(result)
  const rowWithTotal = countResults.data.recordset.find((row) => { return row.total })
  const totalRecords = rowWithTotal ? rowWithTotal.total : 0
  return {
    result: result.data.recordset,
    totalRecords,
    fields: Object.keys(result.data.recordset[0] || {})
  }
}


export function wrapIdentifier(value) {
  return (value !== '*' ? `[${value.replace(/\[/g, '[')}]` : '*');
}

export function wrapValue(value) {
  return `'${value.replace(/'/g, "''")}'`
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

export async function listTableColumns(conn, database, table) {
  const clause = table ? `WHERE table_name = ${wrapValue(table)}` : ""
  const sql = `
    SELECT table_schema, table_name, column_name, data_type,
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
  }));
}

export async function listTableTriggers(conn, table) {
  // SQL Server does not have information_schema for triggers, so other way around
  // is using sp_helptrigger stored procedure to fetch triggers related to table
  const sql = `EXEC sp_helptrigger ${wrapIdentifier(table)}`;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => row.trigger_name);
}

export async function listTableIndexes(conn, database, table) {
  // SQL Server does not have information_schema for indexes, so other way around
  // is using sp_helpindex stored procedure to fetch indexes related to table
  const sql = `EXEC sp_helpindex ${wrapIdentifier(table)}`;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => row.index_name);
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
        from_table = FK.TABLE_NAME,
        from_column = CU.COLUMN_NAME,
        to_table = PK.TABLE_NAME,
        to_column = PT.COLUMN_NAME,
        constraint_name = C.CONSTRAINT_NAME
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
    toTable: row.to_table,
    toColumn: row.to_column,
    fromTable: row.from_table,
    fromColumn: row.from_column,
    onUpdate: null,
    onDelete: null
  }));
  log.debug("tableKeys result", result)
  return result
}

export async function getPrimaryKey(conn, database, table, schema) {
  logger().debug('finding foreign key for', database, table)
  const sql = `
  SELECT COLUMN_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + QUOTENAME(CONSTRAINT_NAME)), 'IsPrimaryKey') = 1
  AND TABLE_NAME = ${wrapValue(table)} AND TABLE_SCHEMA = ${wrapValue(schema)}
  `
  const { data } = await driverExecuteQuery(conn, { query: sql})
  logger().debug('primary key results:', data)
  return data.recordset && data.recordset[0] && data.recordset.length === 1 ? data.recordset[0].COLUMN_NAME : null
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

    if (!server.config.sslCaFile && !server.config.sslCertFile && !server.config.sslKeyFile) {
      options.trustServerCertificate = true
    } else {
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
  logger().debug('Running query', queryArgs)
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
