import { Export } from "@/lib/export/export";
import { DBConnection, TableOrView, TableFilter } from '@/lib/db/client'

interface OutputOptionsCsv {
  header: boolean,
  delimiter: string
}

export default class CsvExporter extends Export {
  readonly format: string = 'csv'

  constructor(
    fileName: string,
    connection: DBConnection,
    table: TableOrView,
    filters: TableFilter[] | any[],
    outputOptions: OutputOptionsCsv,
  ) {
    super(fileName, connection, table, filters, outputOptions)
  }

  async getHeader(firstRow: any) {
    if (firstRow && this.outputOptions.header) {
      return Object.keys(firstRow).join(this.outputOptions.delimiter)
    }
  }

  async getFooter() { }

  formatChunk(data: any): string[] {
    let formattedChunk = []

    for (const row of data) {
      formattedChunk.push(Object.values(row).join(this.outputOptions.delimiter))
    }

    return formattedChunk
  }
}