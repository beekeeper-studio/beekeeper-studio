import Client_Firebird from 'knex-firebird-dialect'
import TableBuilder_Firebird from './schema/firebird-tablebuilder'

export default class FirebirdKnexClient extends Client_Firebird {
  tableBuilder(type, tableName, tableNameLike, fn) {
    return new TableBuilder_Firebird(this, type, tableName, tableNameLike, fn);
  }
}

