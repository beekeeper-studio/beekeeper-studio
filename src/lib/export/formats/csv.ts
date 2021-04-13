import { Export, ExportOptions } from "@/lib/export";
import { DBConnection, TableOrView, TableFilter } from '@/lib/db/client'

interface OutputOptionsCsv {
  header: boolean,
  delimiter: string
}

export class CsvExporter extends Export {
  readonly format: string = 'csv'
  readonly rowOptions = {
    header: false,
  }

  separator: string = '\n'

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

  getHeader(fields: string[]): string {
    // TODO fix this, use papa parse
    if (fields && this.outputOptions.header) {
      return `${fields.join(this.outputOptions.delimiter)}\n`
    } else {
      return ""
    }
  }

  getFooter() { return "" }

  formatRow(row: any): string {

    // TODO: this isn't good enough, need papa parse
    return Object.values(row).join(this.outputOptions.delimiter)
  }
}
