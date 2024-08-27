import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import knexlib from "knex";
import { Knex } from 'knex';
import _ from 'lodash';
import { TableFilter, TableOrView, TableColumn } from '../../db/models';
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
    "tidb": "mysql2",
    "mysql": "mysql2",
    "postgresql": "pg",
    "sqlite": "sqlite3",
    "sqlserver": "mssql"
  }
  private outputOptions: OutputOptionsSql
  knex: Knex

  constructor(
    filePath: string,
    connection: BasicDatabaseClient<any>,
    table: TableOrView,
    query: string,
    queryName: string,
    filters: TableFilter[] | any[],
    options: ExportOptions,
    outputOptions: OutputOptionsSql,
    managerNotify: boolean = true
  ) {
    super(filePath, connection, table, query, queryName, filters, options, managerNotify)
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

  formatRow(rowArray: any[], columns: TableColumn[] = []): string {
    const sanitized = rowArray.map((val, idx) => {
      // error found when attemping to copy over an array into a JSON field https://github.com/beekeeper-studio/beekeeper-studio/issues/1647
      // which is an issue with Knex itself https://github.com/knex/knex/issues/5430
      if (columns[idx]?.dataType.startsWith('json') && Array.isArray(val)) {
        return JSON.stringify(val)
      }
      return val
    })
    const row = this.rowToObject(sanitized)

    let knex = this.knex(this.table.name)
    if (this.outputOptions.schema && this.table.schema) {
      knex = knex.withSchema(this.table.schema)
    }


    const content = knex.insert(row).toQuery()
    return content
  }
}
