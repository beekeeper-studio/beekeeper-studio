import knexlib from 'knex'
import Knex from "knex";
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
    if (this.outputOptions.createTable) {
      const schema = this.table.schema && this.outputOptions.schema ? this.table.schema : ''
      const result = await this.connection.getTableCreateScript(this.table.name, schema)
      if (result) {
        return result
      }
    }
    return ""
  }

  getFooter() {
    return this.rowSeparator
  }

  formatRow(rowArray: any): string {
    const row = this.rowToObject(rowArray)
    let knex = this.knex(this.table.name)
    if (this.outputOptions.schema && this.table.schema) {
      knex = knex.withSchema(this.table.schema)
    }

    const content = knex.insert(row).toQuery()
    return content
  }
}
