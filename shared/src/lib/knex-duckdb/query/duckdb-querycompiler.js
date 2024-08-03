/* eslint-disable */
const QueryCompiler_SQLite3 = require('knex/lib/dialects/sqlite3/query/sqlite-querycompiler');
const { isString } = require('knex/lib/util/is');
const isEmpty = require('lodash/isEmpty');
/* eslint-enable */

class QueryCompiler_DuckDB extends QueryCompiler_SQLite3 {
  insert() {
    const insertValues = this.single.insert || [];
    let sql = this.with() + `insert into ${this.tableName} `;

    if (Array.isArray(insertValues)) {
      if (insertValues.length === 0) {
        return '';
      } else if (
        insertValues.length === 1 &&
        insertValues[0] &&
        isEmpty(insertValues[0])
      ) {
        return {
          sql: sql + this._emptyInsertValue,
        };
      }
    } else if (typeof insertValues === 'object' && isEmpty(insertValues)) {
      return {
        sql: sql + this._emptyInsertValue,
      };
    }

    const insertData = this._prepInsert(insertValues);

    if (isString(insertData)) {
      return {
        sql: sql + insertData,
      };
    }

    if (insertData.columns.length === 0) {
      return {
        sql: '',
      };
    }

    sql += `(${this.formatter.columnize(insertData.columns)})`;

    // // backwards compatible error
    // if (this.client.valueForUndefined !== null) {
    //   insertData.values.forEach((bindings) => {
    //     each(bindings, (binding) => {
    //       if (binding === undefined)
    //         throw new TypeError(
    //           '`sqlite` does not support inserting default values. Specify ' +
    //             'values explicitly or use the `useNullAsDefault` config flag. ' +
    //             '(see docs https://knexjs.org/guide/query-builder.html#insert).'
    //         );
    //     });
    //   });
    // }

    if (insertData.values.length === 1) {
      const parameters = this.client.parameterize(
        insertData.values[0],
        this.client.valueForUndefined,
        this.builder,
        this.bindingsHolder
      );
      sql += ` values (${parameters})`;

      const { onConflict, ignore, merge } = this.single;
      if (onConflict && ignore) sql += this._ignore(onConflict);
      else if (onConflict && merge) {
        sql += this._merge(merge.updates, onConflict, insertValues);
        const wheres = this.where();
        if (wheres) sql += ` ${wheres}`;
      }

      const { returning } = this.single;
      if (returning) {
        sql += this._returning(returning);
      }

      return {
        sql,
        returning,
      };
    }

    const blocks = [];
    let i = -1;
    while (++i < insertData.values.length) {
      let i2 = -1;
      const block = (blocks[i] = []);
      let current = insertData.values[i];
      current = current === undefined ? this.client.valueForUndefined : current;
      while (++i2 < insertData.columns.length) {
        block.push(
          this.client.alias(
            this.client.parameter(
              current[i2],
              this.builder,
              this.bindingsHolder
            ),
            this.formatter.wrap(insertData.columns[i2])
          )
        );
      }
      blocks[i] = block.join(', ');
    }
    sql += ' select ' + blocks.join(' union all select ');

    const { onConflict, ignore, merge } = this.single;
    if (onConflict && ignore) sql += ' where true' + this._ignore(onConflict);
    else if (onConflict && merge) {
      sql +=
        ' where true' + this._merge(merge.updates, onConflict, insertValues);
    }

    const { returning } = this.single;
    if (returning) sql += this._returning(returning);

    return {
      sql,
      returning,
    };
  }
}

module.exports = QueryCompiler_DuckDB;
