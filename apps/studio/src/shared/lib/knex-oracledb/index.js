import BaseClient_Oracledb from "knex/lib/dialects/oracledb";
import QueryCompiler from "./query/oracle-querycompiler";
import { makeEscape } from "knex/lib/util/string";

export default class Client_Oracledb extends BaseClient_Oracledb {
  queryCompiler(builder, formatter) {
    return new QueryCompiler(this, builder, formatter);
  }
}

Client_Oracledb.prototype._escapeBinding = function (value, context) {
  if (Buffer.isBuffer(value)) {
    return `hextoraw('${value.toString("hex")}')`;
  }
  return BaseClient_Oracledb.prototype._escapeBinding.call(
    this,
    value,
    context
  );
};
