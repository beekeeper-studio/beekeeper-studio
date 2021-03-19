import { Export, ExportOptions } from "@/lib/export";
import { DBConnection, TableOrView, TableFilter } from '@/lib/db/client'
import indentString from 'indent-string'

interface OutputOptionsJson {
  prettyprint: boolean
}
export class JsonExporter extends Export {
  readonly format: string = 'json'

  constructor(
    filePath: string,
    connection: DBConnection,
    table: TableOrView,
    filters: TableFilter[] | any[],
    options: ExportOptions,
    outputOptions: OutputOptionsJson
  ) {
    super(filePath, connection, table, filters, options, outputOptions)
  }

  async getHeader(firstRow: any) {
    return '['
  }

  async getFooter() {
    return ']'
  }

  formatChunk(data: any): string[] {
    const formattedChunk = []

    for (const row of data) {
      const spacing = this.outputOptions.prettyprint ? 2 : undefined
      const content = indentString(JSON.stringify(row, null, spacing), 2) + ','

      formattedChunk.push(content)
    }
    
    return formattedChunk
  }
}
