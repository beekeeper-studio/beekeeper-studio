import BaseClient_Firebird from 'knex-firebird-dialect';
import TableBuilder from './schema/firebird-tablebuilder';
import QueryCompiler from "./query/firebird-querycompiler";

export default class Client_Firebird extends BaseClient_Firebird {
  queryCompiler(builder, formatter) {
    return new QueryCompiler(this, builder, formatter);
  }

  tableBuilder(type, tableName, tableNameLike, fn) {
    return new TableBuilder(this, type, tableName, tableNameLike, fn);
  }
}
