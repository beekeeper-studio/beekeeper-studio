// Copyright (c) 2015 The SQLECTRON Team

import { ConnectionPool } from 'mssql';
import { identify } from 'sql-query-identifier';
import _ from 'lodash';

import { buildDatabseFilter, buildSchemaFilter } from './utils';
import createLogger from '../../logger';

const logger = createLogger('db:clients:sqlserver');

const mmsqlErrors = {
  CANCELED: 'ECANCEL',
};


export default async function (server, database) {
  const dbConfig = configDatabase(server, database);
  logger().debug('create driver client for mmsql with config %j', dbConfig);

  const conn = { dbConfig };

  // light solution to test connection with with the server
  await driverExecuteQuery(conn, { query: 'SELECT 1' });

  return {
    wrapIdentifier,
    disconnect: () => disconnect(conn),
    listTables: (db, filter) => listTables(conn, filter),
    listViews: (filter) => listViews(conn, filter),
    listRoutines: (filter) => listRoutines(conn, filter),
    listTableColumns: (db, table) => listTableColumns(conn, db, table),
    listTableTriggers: (table) => listTableTriggers(conn, table),
    listTableIndexes: (db, table) => listTableIndexes(conn, db, table),
    listSchemas: () => listSchemas(conn),
    getTableReferences: (table) => getTableReferences(conn, table),
    getTableKeys: (db, table) => getTableKeys(conn, db, table),
    query: (queryText) => query(conn, queryText),
    executeQuery: (queryText) => executeQuery(conn, queryText),
    listDatabases: (filter) => listDatabases(conn, filter),
    selectTop: (table, offset, limit, orderBy, filters) => selectTop(conn, table, offset, limit, orderBy, filters),
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

export async function selectTop(conn, table, offset, limit, orderBy, filters) {
  let orderByString = ""
  let filterString = ""

  if (orderBy && orderBy.length > 0) {
    orderByString = "order by " + (orderBy.map((item) => {
      if (Array.isArray(item)) {
        return item.join(" ")
      } else {
        return item
      }
    })).join(",")
  }

  if (filters && filters.length > 0) {
    filterString = "WHERE " + filters.map((item) => {
      return `${item.field} ${item.type} '${item.value}'`
    }).join(" AND ")
  }

  let baseSQL = `
    FROM ${table}
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
  const rowWithTotal = countResults.data.recordset.find((row) => { return row.total })
  const totalRecords = rowWithTotal ? rowWithTotal.total : 0
  return {
    result: result.data.recordset,
    totalRecords
  }
}


export function wrapIdentifier(value) {
  return (value !== '*' ? `[${value.replace(/\[/g, '[')}]` : '*');
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

        try {
          const promiseQuery = request.query(queryText);

          queryRequest = request;

          const data = await promiseQuery;

          const commands = identifyCommands(queryText).map((item) => item.type);

          // Executing only non select queries will not return results.
          // So we "fake" there is at least one result.
          const rowsAffected = _.sum(data.rowsAffected)
          const results = !data.recordsets.length && rowsAffected > 0 ? [[]] : data.recordsets;

          return results.map((_, idx) => parseRowQueryResult(results[idx], rowsAffected, commands[idx]));
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


export async function executeQuery(conn, queryText) {
  const { data, rowsAffected } = await driverExecuteQuery(conn, { query: queryText, multiple: true });

  const commands = identifyCommands(queryText).map((item) => item.type);

  // Executing only non select queries will not return results.
  // So we "fake" there is at least one result.
  const results = !data.recordsets.length && rowsAffected > 0 ? [[]] : data.recordsets;

  return results.map((_, idx) => parseRowQueryResult(results[idx], rowsAffected, commands[idx]));
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
    FROM information_schema.tables
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
    FROM information_schema.views
    ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
    ORDER BY table_schema, table_name
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((item) => ({
    schema: item.table_schema,
    name: item.table_name,
  }));
}

export async function listRoutines(conn, filter) {
  const schemaFilter = buildSchemaFilter(filter, 'routine_schema');
  const sql = `
    SELECT
      routine_schema,
      routine_name,
      routine_type
    FROM information_schema.routines
    ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
    GROUP BY routine_schema, routine_name, routine_type
    ORDER BY routine_schema, routine_name
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => ({
    schema: row.routine_schema,
    routineName: row.routine_name,
    routineType: row.routine_type,
  }));
}

export async function listTableColumns(conn, database, table) {
  const sql = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = '${table}'
    ORDER BY ordinal_position
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => ({
    columnName: row.column_name,
    dataType: row.data_type,
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
    FROM information_schema.schemata
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

export async function getTableKeys(conn, database, table) {
  const sql = `
    SELECT
      tc.constraint_name,
      kcu.column_name,
      CASE WHEN tc.constraint_type LIKE '%FOREIGN%' THEN OBJECT_NAME(sfk.referenced_object_id)
      ELSE NULL
      END AS referenced_table_name,
      tc.constraint_type
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN sys.foreign_keys as sfk
      ON sfk.parent_object_id = OBJECT_ID(tc.table_name)
    WHERE tc.table_name = '${table}'
    AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.recordset.map((row) => ({
    constraintName: row.constraint_name,
    columnName: row.column_name,
    referencedTable: row.referenced_table_name,
    keyType: row.constraint_type,
  }));
}

export async function getTableCreateScript(conn, table) {
  // Reference http://stackoverflow.com/a/317864
  const sql = `
    SELECT  ('CREATE TABLE ' + so.name + ' (' +
      CHAR(13)+CHAR(10) + REPLACE(o.list, '&#x0D;', CHAR(13)) +
      ')' + CHAR(13)+CHAR(10) +
      CASE WHEN tc.Constraint_Name IS NULL THEN ''
           ELSE + CHAR(13)+CHAR(10) + 'ALTER TABLE ' + so.Name +
           ' ADD CONSTRAINT ' + tc.Constraint_Name  +
           ' PRIMARY KEY ' + '(' + LEFT(j.List, Len(j.List)-1) + ')'
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
           (CASE WHEN IS_NULLABLE = 'No'
                 THEN 'NOT '
                 ELSE ''
          END ) + 'NULL' +
          CASE WHEN information_schema.columns.COLUMN_DEFAULT IS NOT NULL
               THEN 'DEFAULT '+ information_schema.columns.COLUMN_DEFAULT
               ELSE ''
          END + ',' + CHAR(13)+CHAR(10)
       FROM information_schema.columns WHERE table_name = so.name
       ORDER BY ordinal_position
       FOR XML PATH('')
    ) o (list)
    LEFT JOIN information_schema.table_constraints tc
    ON  tc.Table_name       = so.Name
    AND tc.Constraint_Type  = 'PRIMARY KEY'
    CROSS APPLY
        (SELECT Column_Name + ', '
         FROM   information_schema.key_column_usage kcu
         WHERE  kcu.Constraint_Name = tc.Constraint_Name
         ORDER BY ORDINAL_POSITION
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
    FROM information_schema.routines
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
      FROM information_schema.tables
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
    appName: server.config.applicationName || 'sqlectron',
    domain: server.config.domain,
    pool: {
      max: 5,
    },
    options: {
      encrypt: server.config.ssl,
    },
  };

  if (server.sshTunnel) {
    config.server = server.config.localHost;
    config.port = server.config.localPort;
  }

  return config;
}


function parseRowQueryResult(data, rowsAffected, command) {
  // Fallback in case the identifier could not reconize the command
  const isSelect = !!(data.length || rowsAffected === 0);

  return {
    command: command || (isSelect && 'SELECT'),
    rows: data,
    fields: Object.keys(data[0] || {}).map((name) => ({ name })),
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

export async function driverExecuteQuery(conn, queryArgs) {
  const runQuery = async (connection) => {
    const request = connection.request();
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

  return run(connection);
}
