import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import knexlib from "knex";
import { Knex } from 'knex';
import _ from 'lodash';
import { TableFilter, TableOrView, TableColumn } from '../../db/models';
import { Export } from '../export';
import { ExportOptions } from '../models';

interface OutputOptionsSql {
  createTable: boolean,
  schema: boolean,
  preserveColumnOrder: boolean
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
    "sqlite": "better-sqlite3",
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

  private getColumnNames(rowLength: number, columns: TableColumn[]): string[] {
    const storedColumns = this.dedupedColumns
    const hasColumnNames = (candidate: TableColumn[]) =>
      candidate.length === rowLength && candidate.every(column => column.columnName != null)

    if (hasColumnNames(storedColumns)) return storedColumns.map(column => column.columnName)
    if (hasColumnNames(columns)) return columns.map(column => column.columnName)

    return Array.from({ length: rowLength }, (_value, index) => `col_${index + 1}`)
  }

  formatRow(rowArray: any[], columns: TableColumn[] = []): string {
    const sanitized = rowArray.map((val, idx) => {
      // Handle bit columns - convert booleans and buffers to 0/1
      // https://github.com/beekeeper-studio/beekeeper-studio/issues/3673
      if (columns[idx]?.dataType?.match(/^bit\b/i)) {
        if (val === null || val === undefined) return val
        if (Buffer.isBuffer(val)) return val[0] ? 1 : 0
        return val ? 1 : 0
      }
      // error found when attemping to copy over an array into a JSON field https://github.com/beekeeper-studio/beekeeper-studio/issues/1647
      // which is an issue with Knex itself https://github.com/knex/knex/issues/5430
      if (columns[idx]?.dataType.startsWith('json') && Array.isArray(val)) {
        return JSON.stringify(val)
      }
      return val
    })

    let knex = this.knex(this.table.name)
    if (this.outputOptions.schema && this.table.schema) {
      knex = knex.withSchema(this.table.schema)
    }

    if (this.outputOptions.preserveColumnOrder !== true) {
      const row = this.rowToObject(sanitized)
      return knex.insert(row).toQuery()
    }

    const columnNames = this.getColumnNames(sanitized.length, columns)
    const values = sanitized.map(value => {
      if (value === undefined) {
        if (this.connection.connectionType === "sqlite") {
          throw new Error(
            "SQLite does not support DEFAULT in INSERT values"
          )
        }

        return this.knex.raw("DEFAULT")
      }

      if (_.isPlainObject(value)) {
        return JSON.stringify(value)
      }

      return value
    })

    const insertBody = this.knex.raw(
      `(${columnNames.map(() => '??').join(', ')}) values (${values.map(() => '?').join(', ')})`,
      [...columnNames, ...values]
    )

    const content = knex.insert(insertBody).toQuery()
    return content
  }
}
