import BaseClient_Oracledb from 'knex/lib/dialects/oracledb'
import QueryCompiler from './query/oracle-querycompiler'
import { makeEscape } from "knex/lib/util/string";

export default class Client_Oracledb extends BaseClient_Oracledb {
  queryCompiler(builder, formatter) {
    return new QueryCompiler(this, builder, formatter);
  }
}

Object.assign(Client_Oracledb.prototype, {
  _escapeBinding: makeEscape({
    escapeBuffer(val) {
      return `hextoraw('${val.toString('hex')}')`
    },
  })
})
