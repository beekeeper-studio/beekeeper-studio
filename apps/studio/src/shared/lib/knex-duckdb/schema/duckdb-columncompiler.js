/* eslint-disable */
const ColumnCompiler_SQLite3 = require("knex/lib/dialects/sqlite3/schema/sqlite-columncompiler");
/* eslint-enable */

class ColumnCompiler_DuckDB extends ColumnCompiler_SQLite3 {
  increments(options = { primaryKey: true }) {
    const sequence = `${this.tableCompiler.tableNameRaw}_seq_id`;
    const sql =
      `create sequence ${this.formatter.wrap(sequence)} start 1;` +
      `alter table ${this.formatter.wrap(this.tableCompiler.tableNameRaw)}` +
      `alter column ${this.formatter.wrap(this.getColumnName())}` +
      `set default nextval('${sequence}')`;
    this.pushAdditional(function () {
      this.pushQuery(sql);
    });
    return (
      "integer not null" +
      (this.tableCompiler._canBeAddPrimaryKey(options) ? " primary key" : "")
    );
  }
}

module.exports = ColumnCompiler_DuckDB;
