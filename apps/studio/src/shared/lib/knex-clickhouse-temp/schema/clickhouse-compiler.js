const SchemaCompiler = require('knex/lib/schema/compiler');

class SchemaCompiler_ClickHouse extends SchemaCompiler {
  // Check whether a table exists on the query.
  hasTable(tableName) {
    let sql = 'select * from system.tables where name = ?';
    const bindings = [tableName];

    if (this.schema) {
      sql += ' and database = ?';
      bindings.push(this.schema);
    } else {
      sql += ' and database = database()';
    }

    this.pushQuery({
      sql,
      bindings,
      method: 'select',
      output: function output(resp) {
        return resp.length > 0;
      },
    });
  }
}

module.exports = SchemaCompiler_ClickHouse;
