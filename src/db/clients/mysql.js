import mysql from 'mysql';
import connectTunnel from '../tunnel';


const debug = require('../../debug')('db:clients:mysql');


export default function(serverInfo, databaseName) {
  return new Promise(async (resolve, reject) => {
    let connecting = true;

    let tunnel = null;
    if (serverInfo.ssh) {
      debug('creating ssh tunnel');
      try {
        tunnel = await connectTunnel(serverInfo);
      } catch (error) {
        connecting = false;
        return reject(error);
      }
    }

    debug('creating database connection');
    const localPort = tunnel
      ? tunnel.address().port
      : 0;

    const client = mysql.createConnection(
      _configDatabase(serverInfo, databaseName, localPort)
    );

    client.on('error', error => {
      debug('Connection fatal error %j', error);
      connecting = false;
      reject(error);
    });

    if (tunnel) {
      tunnel.on('error', error => {
        if (connecting) {
          connecting = false;
          return reject(error);
        }
      });
    }

    client.connect(err => {
      connecting = false;
      if (err) {
        client.end();
        return reject(err);
      }

      debug('connected');
      resolve({
        disconnect: () => disconnect(client),
        listTables: () => listTables(client),
        executeQuery: (query) => executeQuery(client, query),
        listDatabases: () => listDatabases(client),
        getQuerySelectTop: (table, limit) => getQuerySelectTop(client, table, limit),
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
      ORDER BY table_name
    `;
    const params = [];
    client.query(sql, params, (err, data) => {
      if (err) return reject(_getRealError(client, err));
      resolve(data.map(row => row.table_name));
    });
  });
}


export function executeQuery(client, query) {
  const parseRowQueryResult = (data, fields) => {
    const isSelect = Array.isArray(data);
    return {
      rows: isSelect ? data : [],
      fields: fields || [],
      rowCount: isSelect ? (data : []).length : undefined,
      affectedRows: !isSelect ? data.affectedRows : undefined,
    };
  };

  const isMultipleQuery = (fields) => {
    if (!fields) { return false; }
    if (!fields.length) { return false; }
    return (Array.isArray(fields[0]) || fields[0] === undefined);
  };

  return new Promise((resolve, reject) => {
    client.query(query, (err, data, fields) => {
      if (err) return reject(_getRealError(client, err));

      if (!isMultipleQuery(fields)) {
        return resolve(parseRowQueryResult(data, fields));
      }

      const result = { rows: [], fields: [], rowCount: [], affectedRows: [] };
      for (let i = 0; i < data.length; i++) {
        const rowResult = parseRowQueryResult(data[i], fields[i]);
        result.rows[i] = rowResult.rows;
        result.fields[i] = rowResult.fields;
        result.rowCount[i] = rowResult.rowCount;
        result.affectedRows[i] = rowResult.affectedRows;
      }

      return resolve(result);
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
  return `SELECT * FROM ${wrapQuery(table)} LIMIT ${limit}`;
}


export function wrapQuery(item) {
  return `\`${item}\``;
}

const getSchema = async (client) => {
  const result = await executeQuery(client, `SELECT database() AS 'schema'`);
  return result.rows[0].schema;
};

export const truncateAllTables = async (client) => {
  const schema = await getSchema(client);
  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = '${schema}'
  `;
  const result = await executeQuery(client, sql);
  const tables = result.rows.map(row => row.table_name);
  const promises = tables.map(t => executeQuery(client, `
    TRUNCATE TABLE ${wrapQuery(schema)}.${wrapQuery(t)}
  `));

  await Promise.all(promises);
};

function _configDatabase(serverInfo, databaseName, localPort) {
  const host = localPort
    ? '127.0.0.1'
    : serverInfo.host || serverInfo.socketPath;
  const port = localPort || serverInfo.port;

  const config = {
    host,
    port,
    user: serverInfo.user,
    password: serverInfo.password,
    database: databaseName,
    multipleStatements: true,
  };

  if (serverInfo.ssl) {
    serverInfo.ssl = {
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
