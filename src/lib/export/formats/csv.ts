import { Export, ExportOptions } from "@/lib/export";
import { DBConnection, TableOrView, TableFilter } from '@/lib/db/client'

interface OutputOptionsCsv {
  header: boolean,
  delimiter: string
}

export class CsvExporter extends Export {
  readonly format: string = 'csv'

  constructor(
    filePath: string,
    connection: DBConnection,
    table: TableOrView,
    filters: TableFilter[] | any[],
    options: ExportOptions,
    outputOptions: OutputOptionsCsv,
  ) {
    super(filePath, connection, table, filters, options, outputOptions)
  }

  async getHeader(firstRow: any) {
    if (firstRow && this.outputOptions.header) {
      return Object.keys(firstRow).join(this.outputOptions.delimiter)
    }
  }

  async getFooter() {}

  formatChunk(data: any): string[] {
    const formattedChunk = []

    for (const row of data) {
      formattedChunk.push(Object.values(row).join(this.outputOptions.delimiter))
    }

    return formattedChunk
  }
}
