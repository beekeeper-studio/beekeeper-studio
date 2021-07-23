import Papa from 'papaparse'
import { DBConnection } from "../../db/client"
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
  rowSeparator: string = '\n'

  private outputOptions: OutputOptionsCsv
  private headerConfig: Papa.UnparseConfig
  private rowConfig: Papa.UnparseConfig = {
    header: false
  }

  constructor(
    filePath: string,
    connection: DBConnection,
    table: TableOrView,
    filters: TableFilter[] | any[],
    options: ExportOptions,
    outputOptions: OutputOptionsCsv,
  ) {
    super(filePath, connection, table, filters, options)
    this.headerConfig = {
      header: true,
      delimiter: outputOptions.delimiter,
    }
    this.outputOptions = outputOptions
    this.rowConfig.delimiter = outputOptions.delimiter
  }

  async getHeader(columns: TableColumn[]): Promise<string> {
    const fields = columns.map(c => c.columnName)
    if (fields.length > 0 && this.outputOptions.header) {
      return Papa.unparse([fields], this.headerConfig)
    }
    return ""
  }

  getFooter() { return "" }

  formatRow(row: any[]): string {
    return Papa.unparse([row], this.rowConfig)
  }
}
