/* eslint-disable */
const filter = require('lodash/filter');
const TableCompiler_SQLite3 = require('knex/lib/dialects/sqlite3/schema/sqlite-tablecompiler');
/* eslint-enable */

class TableCompiler_DuckDB extends TableCompiler_SQLite3 {
  primaryKeys() {
    const pks = filter(this.grouped.alterTable || [], { method: 'primary' });
    if (pks.length > 0 && pks[0].args.length > 0) {
      const columns = pks[0].args[0];
      let constraintName = pks[0].args[1] || '';
      if (constraintName) {
        constraintName = ' constraint ' + this.formatter.wrap(constraintName);
      }
      return `,${constraintName} primary key (${this.formatter.columnize(columns)})`;
    }
  }

  tableName() {
    return this.formatter.wrap(this.tableNameRaw);
  }
}

module.exports = TableCompiler_DuckDB;
