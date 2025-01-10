import QueryCompiler from "knex-firebird-dialect/lib/query/compiler";
import BaseQueryCompiler from "knex/lib/query/querycompiler";

class QueryCompiler_Firebird extends QueryCompiler {
  _prepInsert() {
    return BaseQueryCompiler.prototype._prepInsert.apply(this, arguments);
  }
}

module.exports = QueryCompiler_Firebird;
