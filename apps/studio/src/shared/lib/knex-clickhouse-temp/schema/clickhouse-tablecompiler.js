const TableCompiler = require('knex/lib/schema/tablecompiler')
const filter = require('lodash/filter')

class TableCompiler_ClickHouse extends TableCompiler {
  createQuery(columns, ifNot, like) {
    const createStatement = ifNot
      ? 'create table if not exists '
      : 'create table ';

    let sql = createStatement + this.tableName();

    if (like && this.tableNameLike()) {
      sql += ' as select * from ' + this.tableNameLike() + ' where 0=1';
    } else {
      // so we will need to check for a primary key commands and add the columns
      // to the table's declaration here so they can be created on the tables.
      sql += ' (' + columns.sql.join(', ');
      sql += this.primaryKeys() || '';
      sql += this._addChecks();
      sql += ')';
      sql += ' engine = MergeTree()';
    }

    this.pushQuery(sql);

    if (like) {
      this.addColumns(columns, this.addColumnsPrefix);
    }
  }

  // ClickHouse doesn't support foreign keys
  foreign(foreignData) {
    return "";
  }

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
}

module.exports = TableCompiler_ClickHouse;
