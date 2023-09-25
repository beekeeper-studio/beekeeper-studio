import TableCompiler from 'knex/lib/schema/tablecompiler'
import { isObject } from 'lodash';

/* 
  NOTE(@DAY): this is just the bare minimum to get the app working with BQ
  I'm putting this structure in now just in case we want to improve it.
*/
class BQ_TableCompiler extends TableCompiler {
  createQuery(columns, ifNot, like) {
    const createStatement = ifNot
      ? 'create table if not exists '
      : 'create table ';

    const { client } = this;
    let conn = {};
    let columnsSql = ` (${columns.sql.join(', ')}`;

    columnsSql += this.primaryKeys() || '';
    // TODO (@day): can we use this?
    // columnsSql += this._addChecks();
    columnsSql += ')';

    let sql =
      createStatement +
      this.tableName() +
      (like && this.tableNameLike()
        ? ' like ' + this.tableNameLike()
        : columnsSql);

    this.pushQuery(sql);
  }

  primary(columns, constraintName) {
    let deferrable;
    if (isObject(constraintName)) {
      ({ constraintName, deferrable } = constraintName);
    }
    if (deferrable && deferrable !== 'not deferrable') {
      this.client.logger.warn(
        `bigquery: primary key constraint \`${constraintName}\` will not be deferrable ${deferrable} because bigquery does not support deferred constraints.`
      );
    }

    constraintName = constraintName 
      ? this.formatter.wrap(constraintName)
      : this.formatter.wrap(`${this.tableNameRaw}_pkey`);

    const primaryCols = columns;
    if (this.method !== 'create' && this.method !== 'createIfNot') {
      this.pushQuery(
        `alter table ${this.tableName()} add primary key ${constraintName}(${this.formatter.columnize(primaryCols)}) not enforced`
      );
    }
  }

  primaryKeys() {
    const pks = (this.grouped.alterTable || []).filter(
      (k) => k.method === 'primary'
    );
    if (pks.length > 0 && pks[0].args.length > 0) {
      const columns = pks[0].args[0];
      let constraintName = pks[0].args[1] || '';
      if (constraintName) {
        constraintName = this.formatter.wrap(constraintName);
      }

      return `, ${constraintName} primary key (${this.formatter.columnize(columns)}) not enforced`;
    }
  }

}

export default BQ_TableCompiler;
