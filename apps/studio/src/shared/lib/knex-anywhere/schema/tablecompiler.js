import { generateCombinedName } from '../utils.js';
import TableCompiler, { apply } from 'knex/lib/schema/tablecompiler';

// Table Compiler
// ------

class TableCompiler_Sqlanywhere extends TableCompiler {
  // Compile a rename column command.
  renameColumn(from, to) {
    return this.pushQuery({
      sql: 'alter table ' + this.tableName() + ' rename ' +
        this.formatter.wrap(from) + ' to ' + this.formatter.wrap(to)
    });
  }

  compileAdd(builder) {
    const table = this.formatter.wrap(builder);
    const columns = this.prefixArray('add column', this.getColumns(builder));
    return this.pushQuery({
      sql: 'alter table ' + table + ' ' + columns.join(', ')
    });
  }

  // Adds the "create" query to the query sequence.
  createQuery(columns, ifNot) {
    let sql = 'create table ';
    if( ifNot ) {
      sql += 'if not exists ';
    }
    sql += this.tableName() + ' (' + columns.sql.join(', ') + ')';
    this.pushQuery({
      sql: sql,
      bindings: columns.bindings
    });
    if (this.single.comment) this.comment(this.single.comment);
  }

  // Compiles the comment on the table.
  comment(comment) {
    this.pushQuery('comment on table ' + this.tableName() + ' is ' + "'" + (comment || '') + "'");
  }
  dropColumn() {
    let columns = arguments;
    if (Array.isArray(arguments[0])) {
      columns = arguments[0];
    }
    let sql = 'alter table ' + this.tableName();
    let i = -1;
    while( ++i < columns.length ) {
       sql += ' drop ' + this.formatter.wrap(columns[i]);
    }
    this.pushQuery(sql);
  }

  changeType() {
    // alter table + table + ' modify ' + wrapped + '// type';
  }

  _indexCommand(type, tableName, columns) {
    return this.formatter.wrap(generateCombinedName(type, tableName, columns));
  }

  primary(columns) {
    this.pushQuery('alter table ' + this.tableName() + " add primary key (" + this.formatter.columnize(columns) + ")");
  }

  dropPrimary() {
    this.pushQuery('alter table ' + this.tableName() + ' drop primary key');
  }

  index(columns, indexName) {
    indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand('index', this.tableNameRaw, columns);
    this.pushQuery('create index ' + indexName + ' on ' + this.tableName() +
      ' (' + this.formatter.columnize(columns) + ')');
  }

  dropIndex(columns, indexName) {
    indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand('index', this.tableNameRaw, columns);
    this.pushQuery('drop index ' + indexName);
  }

  unique(columns, indexName) {
    indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand('unique', this.tableNameRaw, columns);
    this.pushQuery('create unique index ' + indexName + ' on ' + this.tableName() + ' (' + this.formatter.columnize(columns) + ')');
  }

  dropUnique(columns, indexName) {
    indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand('unique', this.tableNameRaw, columns);
    this.pushQuery('drop index ' + indexName);
  }

  dropForeign(columns, indexName) {
    indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand('foreign', this.tableNameRaw, columns);
    this.pushQuery('alter table ' + this.tableName() + ' drop constraint ' + indexName);
  }
}

Object.assign(TableCompiler_Sqlanywhere.prototype, {
  addColumnsPrefix: 'add ',
})

export default TableCompiler_Sqlanywhere;
