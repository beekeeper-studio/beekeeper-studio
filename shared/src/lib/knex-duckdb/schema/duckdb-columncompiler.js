/* eslint-disable */
const ColumnCompiler_SQLite3 = require("knex/lib/dialects/sqlite3/schema/sqlite-columncompiler");
/* eslint-enable */

class ColumnCompiler_DuckDB extends ColumnCompiler_SQLite3 {
  increments(options = { primaryKey: true }) {
    const sequence = `seq_${this.tableCompiler.tableNameRaw}_id`;
    // this.pushAdditional(function () {
    //   this.pushQuery(`CREATE SEQUENCE '${sequence}' START 1`);
    // })
    return (
      "integer not null" +
      (this.tableCompiler._canBeAddPrimaryKey(options) ? " primary key" : "") +
      ` DEFAULT nextval('${sequence}')`
    );
  }
}

module.exports = ColumnCompiler_DuckDB;
