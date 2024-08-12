const QueryCompiler = require("knex/lib/query/querycompiler");

class QueryCompiler_ClickHouse extends QueryCompiler {
  // Compiles the "update" query.
  update() {
    // Make sure tableName is processed by the formatter first.
    const withSQL = this.with();
    const { tableName } = this;
    const updateData = this._prepUpdate(this.single.update);
    const wheres = this.where();
    return (
      withSQL +
      `alter table ${tableName} update ` +
      updateData.join(', ') +
      (wheres ? ` ${wheres}` : '')
    );
  }
}

module.exports = QueryCompiler_ClickHouse
