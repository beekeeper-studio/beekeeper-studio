import { Dialect, KnexDialect, Schema, SchemaItem } from '../dialects/models'
import {Knex} from 'knex'
import knexlib from 'knex'
import { BigQueryClient } from '../knex-bigquery'

interface GeneratorConnection {
  dbConfig: any
  dbName: string
}

export class SqlGenerator {
  private _dialect: Dialect
  private _connection: GeneratorConnection
  private knex: Knex
  private isNativeKnex: boolean;

  constructor(dialect: Dialect, connection: GeneratorConnection) {
    this.connection = connection
    this.dialect = dialect
    this.createKnexLib()
  }

  public get dialect() : Dialect {
    return this._dialect
  }

  public set dialect(v : Dialect) {
    this._dialect = v;
    this.isNativeKnex = !['bigquery'].includes(v)
    this.createKnexLib()
  }

  public get connection() {
    return this._connection
  }

  public set connection(config: any) {
    this._connection = config;
    this.createKnexLib()
  }


  public buildSql(schema: Schema): string {
    let k
    if (this.isNativeKnex) {
      k = schema.schema ? this.knex.schema.withSchema(schema.schema) : this.knex.schema
    } else {
      k = this.knex.schema.withSchema(schema.schema ? schema.schema : this._connection.dbName)
    }

    const sql = k.createTable(schema.name, (table) => {

      const primaries = schema.columns.filter(c => this.getPrimaries(c))
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

  private getPrimaries(c): boolean {
    if (this.isNativeKnex) {
      return c.primaryKey && c.dataType !== 'autoincrement'
    }

    return c.primaryKey
  }

  private async createKnexLib () {
    const { dbConfig  } = this.connection
    if (!this.dialect || !this.connection) return
    if (this.isNativeKnex) {
      this.knex = knexlib({client: this.knexDialect})
    } else {
      const apiEndpoint = dbConfig.host !== "" && dbConfig.port !== "" ? `http://${dbConfig.host}:${dbConfig.port}` : undefined;
      this.knex = knexlib({
        // ewwwwwwwww
        client: BigQueryClient as any,
        connection: {
          projectId: dbConfig.bigQueryOptions?.projectId,
          keyFilename: dbConfig.bigQueryOptions?.keyFilename,
          // for testing
          apiEndpoint
        } as any
      })
    }
  }

  private get knexDialect() {
    return KnexDialect(this.dialect)
  }


}
