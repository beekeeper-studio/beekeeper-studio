import {Connection} from 'mssql';
import { identify } from 'sql-query-identifier';


const debug = require('../../debug')('db:clients:sqlserver');


export default async function(server, database) {
  let connection;
  try {
    const dbConfig = _configDatabase(server, database);

    debug('creating database connection %j', dbConfig);
    connection = new Connection(dbConfig);

    debug('connecting');
    await connection.connect();

    debug('connected');
    return {
      wrapIdentifier,
      disconnect: () => disconnect(connection),
      listTables: () => listTables(connection),
      listViews: () => listViews(connection),
      listRoutines: () => listRoutines(connection),
      listTableColumns: (table) => listTableColumns(connection, table),
      listTableTriggers: (table) => listTableTriggers(connection, table),
      getTableReferences: (table) => getTableReferences(connection, table),
      getTableKeys: (table) => getTableKeys(connection, table),
      executeQuery: (query) => executeQuery(connection, query),
      listDatabases: () => listDatabases(connection),
      getQuerySelectTop: (table, limit) => getQuerySelectTop(connection, table, limit),
      getTableCreateScript: (table) => getTableCreateScript(connection, table),
      getViewCreateScript: (view) => getViewCreateScript(connection, view),
      getRoutineCreateScript: (routine) => getRoutineCreateScript(connection, routine),
      truncateAllTables: () => truncateAllTables(connection),
    };
  } catch (err) {
    if (connection) {
      connection.close();
    }
    throw err;
  }
}


export const disconnect = (connection) => connection.close();
export const wrapIdentifier = (value) => (value !== '*' ? `[${value.replace(/\[/g, '\[')}]` : '*');
export const getQuerySelectTop = (client, table, limit) => `SELECT TOP ${limit} * FROM ${wrapIdentifier(table)}`;


export const executeQuery = async (connection, query) => {
  const commands = identifyCommands(query);

  const request = connection.request();
  request.multiple = true;

  const recordSet = await request.query(query);

  // Executing only non select queries will not return results.
  // So we "fake" there is at least one result.
  const results = !recordSet.length && request.rowsAffected ? [[]] : recordSet;

  return results.map((_, idx) => parseRowQueryResult(results[idx], request, commands[idx]));
};


const getSchema = async (connection) => {
  const [result] = await executeQuery(connection, `SELECT schema_name() AS 'schema'`);
  return result.rows[0].schema;
};


export const listTables = async (connection) => {
  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_type NOT LIKE '%VIEW%'
    ORDER BY table_name
  `;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => row.table_name);
};

export const listViews = async (connection) => {
  const sql = `
    SELECT table_name
    FROM information_schema.views
    ORDER BY table_name
  `;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => row.table_name);
};

export const listRoutines = async (connection) => {
  const sql = `
    SELECT routine_name, routine_type
    FROM information_schema.routines
    ORDER BY routine_name
  `;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => ({
    routineName: row.routine_name,
    routineType: row.routine_type,
  }));
};

export const listTableColumns = async (connection, table) => {
  const sql = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = '${table}'
  `;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => ({
    columnName: row.column_name,
    dataType: row.data_type,
  }));
};

export const listTableTriggers = async (connection, table) => {
  // SQL Server does not have information_schema for triggers, so other way around
  // is using sp_helptrigger stored procedure to fetch triggers related to table
  const sql = `
    EXEC sp_helptrigger ${wrapIdentifier(table)}
  `;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => row.trigger_name);
};

export const listDatabases = async (connection) => {
  const [result] = await executeQuery(connection, 'SELECT name FROM sys.databases');
  return result.rows.map(row => row.name);
};

export const getTableReferences = async (connection, table) => {
  const sql = `
    SELECT OBJECT_NAME(referenced_object_id) referenced_table_name
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID('${table}')
  `;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => row.referenced_table_name);
};

export const getTableKeys = async (connection, table) => {
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
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => ({
    constraintName: row.constraint_name,
    columnName: row.column_name,
    referencedTable: row.referenced_table_name,
    keyType: row.constraint_type,
  }));
};

export const getTableCreateScript = async (connection, table) => {
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
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => row.createtable);
};

export const getViewCreateScript = async (connection, view) => {
  const sql = `SELECT OBJECT_DEFINITION (OBJECT_ID('${view}')) AS ViewDefinition;`;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => row.ViewDefinition);
};

export const getRoutineCreateScript = async (connection, routine) => {
  const sql = `
    SELECT routine_definition
    FROM information_schema.routines
    WHERE routine_name = '${routine}'
  `;
  const [result] = await executeQuery(connection, sql);
  return result.rows.map(row => row.routine_definition);
};

export const truncateAllTables = async (connection) => {
  const schema = await getSchema(connection);
  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = '${schema}'
    AND table_type NOT LIKE '%VIEW%'
  `;
  const [result] = await executeQuery(connection, sql);
  const tables = result.rows.map(row => row.table_name);
  const promises = tables.map(t => executeQuery(connection, `
    DELETE FROM ${wrapIdentifier(schema)}.${wrapIdentifier(t)}
    DBCC CHECKIDENT ('${schema}.${t}', RESEED, 0)
  `));

  await Promise.all(promises);
};


function _configDatabase(server, database) {
  const config = {
    user: server.config.user,
    password: server.config.password,
    server: server.config.host,
    database: database.database,
    port: server.config.port,
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


function parseRowQueryResult(data, request, command) {
  // Fallback in case the identifier could not reconize the command
  const isSelect = !!(data.length || !request.rowsAffected);

  return {
    command: command || (isSelect && 'SELECT'),
    rows: data,
    fields: Object.keys(data[0] || {}).map(name => ({ name })),
    rowCount: data.length,
    affectedRows: request.rowsAffected,
  };
}


function identifyCommands(query) {
  try {
    return identify(query);
  } catch (err) {
    return [];
  }
}
