import mysql from 'mysql';
import { identify } from 'sql-query-identifier';

const debug = require('../../debug')('db:clients:mysql');
const mysqlErrors = {
  ER_EMPTY_QUERY: 'ER_EMPTY_QUERY',
};


export default function(server, database) {
  return new Promise(async (resolve, reject) => {
    const dbConfig = _configDatabase(server, database);

    debug('creating database client %j', dbConfig);
    const client = mysql.createConnection(dbConfig);

    client.on('error', error => {
      // it will be handled later in the next query execution
      debug('Connection fatal error %j', error);
    });

    debug('connecting');
    client.connect(err => {
      if (err) {
        client.end();
        return reject(err);
      }

      debug('connected');
      resolve({
        wrapIdentifier,
        disconnect: () => disconnect(client),
        listTables: () => listTables(client),
        listViews: () => listViews(client),
        listRoutines: () => listRoutines(client),
        listTableColumns: (table) => listTableColumns(client, table),
        listTableTriggers: (table) => listTableTriggers(client, table),
        getTableReferences: (table) => getTableReferences(client, table),
        getTableKeys: (table) => getTableKeys(client, table),
        executeQuery: (query) => executeQuery(client, query),
        listDatabases: () => listDatabases(client),
        getQuerySelectTop: (table, limit) => getQuerySelectTop(client, table, limit),
        getTableCreateScript: (table) => getTableCreateScript(client, table),
        getViewCreateScript: (view) => getViewCreateScript(client, view),
        getRoutineCreateScript: (routine, type) => getRoutineCreateScript(client, routine, type),
        truncateAllTables: () => truncateAllTables(client),
      });
    });
  });
}


export function disconnect(client) {
  client.end();
}


export function listTables(client) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = database()
      AND table_type NOT LIKE '%VIEW%'
      ORDER BY table_name
    `;
    const params = [];
    client.query(sql, params, (err, data) => {
      if (err) return reject(_getRealError(client, err));
      resolve(data.map(row => row.table_name));
    });
  });
}

export function listViews(client) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = database()
      ORDER BY table_name
    `;
    const params = [];
    client.query(sql, params, (err, data) => {
      if (err) return reject(_getRealError(client, err));
      resolve(data.map(row => row.table_name));
    });
  });
}

export function listRoutines(client) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = database()
      ORDER BY routine_name
    `;
    const params = [];
    client.query(sql, params, (err, data) => {
      if (err) return reject(_getRealError(client, err));
      resolve(data.map(row => ({
        routineName: row.routine_name,
        routineType: row.routine_type,
      })));
    });
  });
}

export function listTableColumns(client, table) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = database()
      AND table_name = ?
    `;
    const params = [
      table,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(_getRealError(client, err));
      resolve(data.map(row => ({
        columnName: row.column_name,
        dataType: row.data_type,
      })));
    });
  });
}

export function listTableTriggers(client, table) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_schema = database()
      AND event_object_table = ?
    `;
    const params = [
      table,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(_getRealError(client, err));
      resolve(data.map(row => row.trigger_name));
    });
  });
}

export function getTableReferences(client, table) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT referenced_table_name
      FROM information_schema.key_column_usage
      WHERE referenced_table_name IS NOT NULL
      AND table_schema = database()
      AND table_name = ?
    `;
    const params = [
      table,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(_getRealError(client, err));
      resolve(data.map(row => row.referenced_table_name));
    });
  });
}

export function getTableKeys(client, table) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT constraint_name, column_name, referenced_table_name,
        CASE WHEN (referenced_table_name IS NOT NULL) THEN 'FOREIGN'
        ELSE constraint_name
        END as key_type
      FROM information_schema.key_column_usage
      WHERE table_schema = database()
      AND table_name = ?
      AND ((referenced_table_name IS NOT NULL) OR constraint_name LIKE '%PRIMARY%')
    `;
    const params = [
      table,
    ];
    client.query(sql, params, (err, data) => {
      if (err) return reject(_getRealError(client, err));
      resolve(data.map(row => ({
        constraintName: `${row.constraint_name} KEY`,
        columnName: row.column_name,
        referencedTable: row.referenced_table_name,
        keyType: `${row.key_type} KEY`,
      })));
    });
  });
}

export function executeQuery(client, query) {
  const commands = identifyCommands(query);
  return new Promise((resolve, reject) => {
    client.query(query, (err, data, fields) => {
      if (err && err.code === mysqlErrors.ER_EMPTY_QUERY) return resolve([]);
      if (err) return reject(_getRealError(client, err));

      if (!isMultipleQuery(fields)) {
        return resolve([parseRowQueryResult(data, fields, commands[0])]);
      }

      resolve(
        data.map((_, idx) => parseRowQueryResult(data[idx], fields[idx], commands[idx]))
      );
    });
  });
}


export function listDatabases(client) {
  return new Promise((resolve, reject) => {
    const sql = 'show databases';
    client.query(sql, (err, data) => {
      if (err) return reject(_getRealError(client, err));
      resolve(data.map(row => row.Database));
    });
  });
}


export function getQuerySelectTop(client, table, limit) {
  return `SELECT * FROM ${wrapIdentifier(table)} LIMIT ${limit}`;
}

export function getTableCreateScript(client, table) {
  return new Promise((resolve, reject) => {
    const sql = `SHOW CREATE TABLE ${table}`;
    const params = [];
    client.query(sql, params, (err, data) => {
      if (err) return reject(_getRealError(client, err));
      resolve(data.map(row => row['Create Table']));
    });
  });
}

export function getViewCreateScript(client, view) {
  return new Promise((resolve, reject) => {
    const sql = `SHOW CREATE VIEW ${view}`;
    const params = [];
    client.query(sql, params, (err, data) => {
      if (err) return reject(_getRealError(client, err));
      resolve(data.map(row => row['Create View']));
    });
  });
}

export function getRoutineCreateScript(client, routine, type) {
  return new Promise((resolve, reject) => {
    const sql = `SHOW CREATE ${type.toUpperCase()} ${routine}`;
    client.query(sql, (err, data) => {
      if (err) return reject(_getRealError(client, err));
      resolve(data.map(row => row[`Create ${type}`]));
    });
  });
}

export function wrapIdentifier(value) {
  return (value !== '*' ? `\`${value.replace(/`/g, '``')}\`` : '*');
}

const getSchema = async (client) => {
  const [result] = await executeQuery(client, `SELECT database() AS 'schema'`);
  return result.rows[0].schema;
};

export const truncateAllTables = async (client) => {
  const schema = await getSchema(client);
  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = '${schema}'
    AND table_type NOT LIKE '%VIEW%'
  `;
  const [result] = await executeQuery(client, sql);
  const tables = result.rows.map(row => row.table_name);
  const promises = tables.map(t => executeQuery(client, `
    SET FOREIGN_KEY_CHECKS = 0;
    TRUNCATE TABLE ${wrapIdentifier(schema)}.${wrapIdentifier(t)};
    SET FOREIGN_KEY_CHECKS = 1;
  `));

  await Promise.all(promises);
};


function _configDatabase(server, database) {
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
  };

  if (server.sshTunnel) {
    config.host = server.config.localHost;
    config.port = server.config.localPort;
  }

  if (server.config.ssl) {
    server.config.ssl = {
      // It is not the best recommend way to use SSL with node-mysql
      // https://github.com/felixge/node-mysql#ssl-options
      // But this way we have compatibility with all clients.
      rejectUnauthorized: false,
    };
  }

  return config;
}


function _getRealError(client, err) {
  if (client && client._protocol && client._protocol._fatalError) {
    return client._protocol._fatalError;
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
    rowCount: isSelect ? (data : []).length : undefined,
    affectedRows: !isSelect ? data.affectedRows : undefined,
  };
}


function isMultipleQuery(fields) {
  if (!fields) { return false; }
  if (!fields.length) { return false; }
  return (Array.isArray(fields[0]) || fields[0] === undefined);
}


function identifyCommands(query) {
  try {
    return identify(query);
  } catch (err) {
    return [];
  }
}
