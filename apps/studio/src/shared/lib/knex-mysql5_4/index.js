import Client_MySQL2 from 'knex/lib/dialects/mysql2'
import TableBuilder_MySQL5_4 from './schema/mysql5_4-tablebuilder'

export default class MySQL5_4KnexClient extends Client_MySQL2 {
  tableBuilder(type, tableName, tableNameLike, fn) {
    return new TableBuilder_MySQL5_4(this, type, tableName, tableNameLike, fn);
  }
}

