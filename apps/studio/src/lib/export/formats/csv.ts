import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'
import Papa from 'papaparse'
import { TableColumn, TableFilter, TableOrView } from "../../db/models"
import { Export } from "../export"
import { ExportOptions } from "../models"

interface OutputOptionsCsv {
  header: boolean,
  delimiter: string
}

export class CsvExporter extends Export {
  static extension = "csv"
  readonly format: string = 'csv'
  rowSeparator = '\n'

  preserveComplex = false

  private outputOptions: OutputOptionsCsv
  private headerConfig: Papa.UnparseConfig
  private rowConfig: Papa.UnparseConfig = {
    header: false
  }

  constructor(
    filePath: string,
    connection: BasicDatabaseClient<any>,
    table: TableOrView,
    query: string,
    queryName: string,
    filters: TableFilter[] | any[],
    options: ExportOptions,
    outputOptions: OutputOptionsCsv,
    managerNotify: boolean = true
  ) {
    super(filePath, connection, table, query, queryName, filters, options, managerNotify)
    this.headerConfig = {
      header: table ? true : false, // dont know columns for query
      delimiter: outputOptions.delimiter,
    }
    this.outputOptions = outputOptions
    this.rowConfig.delimiter = outputOptions.delimiter
  }

  async getHeader(columns: TableColumn[]): Promise<string> {
    if (!columns) return ""
    const fields = columns.map(c => c.columnName)
    if (fields.length > 0 && this.outputOptions.header) {
      return Papa.unparse([fields], this.headerConfig) + this.rowSeparator
    }
    return ""
  }

  getFooter() { return "" }

  formatRow(row: any[]): string {
    return Papa.unparse([row], this.rowConfig)
  }
}
