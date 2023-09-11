import TableCompiler from 'knex/lib/schema/tablecompiler'

/* 
  NOTE(@DAY): this is just the bare minimum to get the app working with BQ
  I'm putting this structure in now just in case we want to improve it.
*/
class BQ_TableCompiler extends TableCompiler {
  createQuery(columns, ifNot) {
    if (ifNot) throw new Error('cerateQuery ifNot not implemented');

    let sql = `CREATE TABLE ${this.tableName()} (${columns.sql.join(', ')})`;

    this.pushQuery(sql);
  }
}

export default BQ_TableCompiler;
