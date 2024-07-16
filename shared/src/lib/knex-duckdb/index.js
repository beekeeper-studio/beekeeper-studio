/* eslint-disable */
const Client_SQLite3 = require("knex/lib/dialects/sqlite3");
const QueryCompiler = require("./query/duckdb-querycompiler");
const ColumnCompiler = require("./schema/duckdb-columncompiler");
const SchemaCompiler = require("./schema/duckdb-compiler");
const TableCompiler = require("./schema/duckdb-tablecompiler");
/* eslint-enable */

class Client_DuckDB extends Client_SQLite3 {
  constructor(config) {
    super(config);
    // FIXME remove sqlite  warnings
    if (config.connection && config.connection.filename === undefined && config.connection.connectionInstance === undefined) {
      this.logger.warn(
        'Could not find `connection.filename` or `connection.connectionInstance` in config. Please specify ' +
          'the database path and name or an instance of `duckdb.Connection` to avoid errors. ' +
          '(see docs https://knexjs.org/guide/#configuration-options)'
      );
    }
  }

  _driver() {
    return require("duckdb");
  }

  wrapIdentifierImpl(value) {
    return value !== '*' ? `"${value.replace(/"/g, '""')}"` : '*';
  }

  queryCompiler(builder, formatter) {
    return new QueryCompiler(this, builder, formatter);
  }

  schemaCompiler() {
    return new SchemaCompiler(this, ...arguments);
  }

  columnCompiler() {
    return new ColumnCompiler(this, ...arguments);
  }

  tableCompiler() {
    return new TableCompiler(this, ...arguments);
  }

  acquireRawConnection() {
    if (this.config.connection.connectionInstance) {
      return Promise.resolve(this.config.connection.connectionInstance);
    }

    return new Promise((resolve, reject) => {
      // the default mode for sqlite3
      let flags = this.driver.OPEN_READWRITE | this.driver.OPEN_CREATE;

      if (this.connectionSettings.flags) {
        if (!Array.isArray(this.connectionSettings.flags)) {
          throw new Error(`flags must be an array of strings`);
        }
        this.connectionSettings.flags.forEach((_flag) => {
          if (!_flag.startsWith('OPEN_') || !this.driver[_flag]) {
            throw new Error(`flag ${_flag} not supported by duckdb`);
          }
          flags = flags | this.driver[_flag];
        });
      }

      const db = new this.driver.Database(
        this.connectionSettings.filename,
        flags,
        (err) => {
          if (err) {
            return reject(err);
          }
          resolve(db);
        }
      );
    });
  }

  // async destroyRawConnection(connection) {
  //   const close = promisify((cb) => connection.close(cb));
  //   return close();
  // }

  // Runs the query on the specified connection, providing the bindings and any
  // other necessary prep work.
  _query(connection, obj) {
    if (!obj.sql) throw new Error('The query is empty');

    const { method } = obj;
    let callMethod;
    switch (method) {
      case 'insert':
      case 'update':
        callMethod = obj.returning ? 'all' : 'run';
        break;
      case 'counter':
      case 'del':
        callMethod = 'run';
        break;
      default:
        callMethod = 'all';
    }
    return new Promise(function (resolver, rejecter) {
      if (!connection || !connection[callMethod]) {
        return rejecter(
          new Error(`Error calling ${callMethod} on connection.`)
        );
      }
      connection[callMethod](obj.sql, ...obj.bindings, function (err, response) {
        if (err) return rejecter(err);
        obj.response = response;

        // We need the context here, as it contains
        // the "this.lastID" or "this.changes"
        obj.context = this;

        return resolver(obj);
      });
    });
  }
}

Object.assign(Client_DuckDB.prototype, {
  driverName: 'duckdb',
  dialect: 'duckdb',
});

module.exports = { Client_DuckDB };
