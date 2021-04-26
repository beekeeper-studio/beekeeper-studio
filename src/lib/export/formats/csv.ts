import Papa from 'papaparse'
import { DBConnection } from "../../db/client"
import { TableFilter, TableOrView } from "../../db/models"
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
  private papaHeader: Papa.UnparseConfig
  private papaRow: Papa.UnparseConfig = {
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
    this.papaHeader = {
      header: true,
      delimiter: outputOptions.delimiter,
    }
    this.outputOptions = outputOptions
    this.papaRow.delimiter = outputOptions.delimiter
  }

  async getHeader(fields: string[]): Promise<string> {
    if (fields.length > 0 && this.outputOptions.header) {
      return Papa.unparse([fields], this.papaHeader)
    }
    return ""
  }

  getFooter() { return "" }

  formatRow(row: any): string {
    return Papa.unparse([row], this.papaRow)
  }
}
