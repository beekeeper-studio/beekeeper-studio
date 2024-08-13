/* eslint-disable */
const SchemaCompiler_SQLite3 = require("knex/lib/dialects/sqlite3/schema/sqlite-compiler");
/* eslint-enable */

class SchemaCompiler_DuckDB extends SchemaCompiler_SQLite3 {
  createSchema(schemaName) {
    this.pushQuery(`create schema ${this.formatter.wrap(schemaName)}`);
  }

  createSchemaIfNotExists(schemaName) {
    this.pushQuery(
      `create schema if not exists ${this.formatter.wrap(schemaName)}`
    );
  }

  dropSchema(schemaName, cascade = false) {
    this.pushQuery(
      `drop schema ${this.formatter.wrap(schemaName)}${
        cascade ? " cascade" : ""
      }`
    );
  }

  dropSchemaIfExists(schemaName, cascade = false) {
    this.pushQuery(
      `drop schema if exists ${this.formatter.wrap(schemaName)}${
        cascade ? " cascade" : ""
      }`
    );
  }
}

module.exports = SchemaCompiler_DuckDB;
