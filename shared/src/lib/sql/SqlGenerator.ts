import { Dialect, KnexDialect, Schema, SchemaItem } from '../dialects/models'
import Knex from 'knex'

export class SqlGenerator {
  private _dialect: Dialect
  private knex: Knex

  constructor(dialect: Dialect) {
    this.dialect = dialect
  }

  public get dialect() : Dialect {
    return this._dialect
  }

  public set dialect(v : Dialect) {
    this._dialect = v;
    this.knex = Knex({client: this.knexDialect})
  }


  public buildSql(schema: Schema): string {
    const k = schema.schema ? this.knex.schema.withSchema(schema.schema) : this.knex.schema
    
    const sql = k.createTable(schema.name, (table) => {

      const primaries = schema.columns.filter((c) => c.primaryKey && c.dataType !== 'autoincrement')
      if (primaries.length > 0) {
        table.primary(primaries.map((c) => c.columnName))
      }
      schema.columns.forEach((column: SchemaItem) => {
        const col = column.dataType === 'autoincrement' ?
          table.increments(column.columnName) :
          table.specificType(column.columnName, column.dataType)
        if (column.defaultValue) col.defaultTo(this.knex.raw(column.defaultValue))
        if (column.unsigned) col.unsigned()
        if (column.comment) col.comment(column.comment)
        column.nullable ? col.nullable() : col.notNullable()
      })
    }).toQuery()

    return sql
  }


// Private below here plz

  private get knexDialect() {
    return KnexDialect(this.dialect)
  }


}