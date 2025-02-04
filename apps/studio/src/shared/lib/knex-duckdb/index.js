/**
 * @typedef {{
 *    rows: import("@duckdb/node-api").DuckDBValue,
 *    result: import("@duckdb/node-api").DuckDBMaterializedResult,
 *  }} QueryResponse
 **/

/* eslint-disable */
const { DuckDBBlobValue, DuckDBBlobType, DuckDBAnyType } = require("@duckdb/node-api");
const Client = require("knex/lib/client");
const QueryCompiler = require("./query/duckdb-querycompiler");
const ColumnCompiler = require("./schema/duckdb-columncompiler");
const SchemaCompiler = require("./schema/duckdb-compiler");
const TableCompiler = require("./schema/duckdb-tablecompiler");
/* eslint-enable */

class Client_DuckDB extends Client {
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
    return require("@duckdb/node-api");
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

  async acquireRawConnection() {
    if (this.config.connection.connectionInstance) {
      return this.config.connection.connectionInstance;
    }

    // the default mode for sqlite3
    let flags = this.driver.OPEN_READWRITE | this.driver.OPEN_CREATE;

    if (this.connectionSettings.flags) {
      if (!Array.isArray(this.connectionSettings.flags)) {
        throw new Error(`flags must be an array of strings`);
      }
      this.connectionSettings.flags.forEach((_flag) => {
        if (!_flag.startsWith("OPEN_") || !this.driver[_flag]) {
          throw new Error(`flag ${_flag} not supported by duckdb`);
        }
        flags = flags | this.driver[_flag];
      });
    }

    const ins = await this.driver.DuckDBInstance.create(
      this.connectionSettings.filename
      // { access_mode: this.readOnlyMode ? "READ_ONLY" : "READ_WRITE" }
    );
    const connection = await ins.connect();
    return connection;
  }

  async destroyRawConnection(connection) {
    const close = promisify((cb) => connection.close(cb));
    return close();
  }

  // Runs the query on the specified connection, providing the bindings and any
  // other necessary prep work.
  /** @param {import("@duckdb/node-api").DuckDBConnection} connection */
  async _query(connection, obj) {
    if (!obj.sql) throw new Error("The query is empty");

    const statement = await connection.prepare(obj.sql);
    if (obj.bindings) {
      const { values, types } = this.buildStatementBindArgs(obj.bindings);
      statement.bind(values, types);
    }
    const result = await statement.run();
    obj.response = {
      rows: obj.method === "insert" ? await result.getRows() : await result.getRowObjects(),
      result,
    };

    // We need the context here, as it contains
    // the "this.lastID" or "this.changes"
    obj.context = this;

    return obj;
  }

  buildStatementBindArgs(bindings) {
    const values = [];
    const types = {};
    bindings.forEach((binding, idx) => {
      if (Buffer?.isBuffer(binding) || ArrayBuffer.isView(binding)) {
        values.push(new DuckDBBlobValue(binding))
        types[idx] = DuckDBBlobType.instance
      } else {
        values.push(binding)
      }
    })
    return { values, types }
  }

  // Process the response as returned from the query.
  /** @param {{response: QueryResponse}} obj */
  processResponse(obj, runner) {
    if (obj == null) return;
    const { response } = obj;
    const { method } = obj;
    const rows = response.rows;
    const fields = response.result.columnNames();
    if (obj.output) return obj.output.call(runner, rows, fields);
    switch (method) {
      case "select":
        return rows;
      case "first":
        return rows[0];
      case "pluck":
        return map(rows, obj.pluck);
      case "insert":
        return [rows[0][0]];
      case "del":
      case "update":
      case "counter":
        return response.result.rowsChanged;
      default:
        return response;
    }
  }
}

Object.assign(Client_DuckDB.prototype, {
  driverName: 'duckdb',
  dialect: 'duckdb',
});

module.exports = { Client_DuckDB };
