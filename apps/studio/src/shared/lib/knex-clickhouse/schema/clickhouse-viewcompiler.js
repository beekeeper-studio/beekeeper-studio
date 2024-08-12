const ViewCompiler = require('knex/lib/schema/viewcompiler');

class ViewCompiler_ClickHouse extends ViewCompiler {
  createQuery(_columns, selectQuery, materialized, replace) {
    const createStatement =
      'create ' +
      (materialized ? 'materialized ' : '') +
      (replace ? 'or replace ' : '') +
      'view ';
    let sql = createStatement + this.viewName();
    sql += ' as ';
    sql += selectQuery.toString();
    this.pushQuery({
      sql,
    });
  }
}

module.exports = ViewCompiler_ClickHouse;
