import knexlib from 'knex'
import Knex from "knex";
import _ from 'lodash';
import { DBConnection } from '../../db/client';
import { TableFilter, TableOrView } from '../../db/models';
import { Export } from '../export';
import { ExportOptions } from '../models';

interface OutputOptionsSql {
  createTable: boolean,
  schema: boolean
}
export class SqlExporter extends Export {
  public static extension = "sql"
  readonly format: string = 'sql'

  readonly rowSeparator: string = ';\n'
  readonly knexTypes: any = {
    "cockroachdb": "pg",
    "mariadb": "mysql2",
    "mysql": "mysql2",
    "postgresql": "pg",
    "sqlite": "sqlite3",
    "sqlserver": "mssql"
  }
  private outputOptions: OutputOptionsSql
  knex: Knex

  constructor(
    filePath: string,
    connection: DBConnection,
    table: TableOrView,
    filters: TableFilter[] | any[],
    options: ExportOptions,
    outputOptions: OutputOptionsSql
  ) {
    super(filePath, connection, table, filters, options)
    this.outputOptions = outputOptions
    if (!this.connection.connectionType || !this.knexTypes[this.connection.connectionType]) {
      throw new Error("SQL export not supported on connection type " + this.connection.connectionType)
    }

    this.knex = knexlib({ client: this.knexTypes[this.connection.connectionType] || undefined })
  }

  async getHeader(): Promise<string> {
    console.log("getting header")
    if (this.outputOptions.createTable) {
      const schema = this.table.schema && this.outputOptions.schema ? this.table.schema : ''
      const result = await this.connection.getTableCreateScript(this.table.name, schema)
      if (result) {
        console.log("returning header ", result)
        const returnValue: string = _.isArray(result) ? result[0] : result
        return returnValue.endsWith(';') ? returnValue : `${returnValue};`
      }
    }
    return ""
  }

  getFooter() {
    return ""
  }

  formatRow(rowArray: any): string {
    const row = this.rowToObject(rowArray)
    let knex = this.knex(this.table.name)
    if (this.outputOptions.schema && this.table.schema) {
      knex = knex.withSchema(this.table.schema)
    }

    const result = _.mapValues(row, (v) => {
      if (_.isObject(v)) return JSON.stringify(v)
      return v
    })


    const content = knex.insert(result).toQuery()
    return content
  }
}
