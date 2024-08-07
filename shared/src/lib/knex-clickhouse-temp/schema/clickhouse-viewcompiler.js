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
    // switch (this.single.checkOption) {
    //   case 'default_option':
    //     sql += ' with check option';
    //     break;
    //   case 'local':
    //     sql += ' with local check option';
    //     break;
    //   case 'cascaded':
    //     sql += ' with cascaded check option';
    //     break;
    //   default:
    //     break;
    // }
    this.pushQuery({
      sql,
    });
  }
}

module.exports = ViewCompiler_ClickHouse;
