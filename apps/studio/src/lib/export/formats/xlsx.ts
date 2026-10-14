import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'
import { TableColumn, TableFilter, TableOrView } from "../../db/models"
import { Export } from "../export"
import { ExportOptions, ExportStatus } from "../models"
import { XlsxWriter } from '../xlsxWriter'

/**
 * Streams a table or query into a single-sheet Excel workbook.
 * Rows beyond Excel's limits are dropped and `truncated` is set.
 */
export class XlsxExporter extends Export {
  static extension = "xlsx"
  readonly format: string = 'xlsx'
  rowSeparator = ''

  preserveComplex = false

  private writer?: XlsxWriter

  constructor(
    filePath: string,
    connection: BasicDatabaseClient<any>,
    table: TableOrView,
    query: string,
    queryName: string,
    filters: TableFilter[] | any[],
    options: ExportOptions,
    _outputOptions: unknown = {},
    managerNotify: boolean = true
  ) {
    super(filePath, connection, table, query, queryName, filters, options, managerNotify)
  }

  protected async openOutput(): Promise<void> {
    this.writer = new XlsxWriter(this.filePath, this.table?.name ?? this.queryName)
    await this.writer.open()
  }

  protected async writeOutput(chunk: string): Promise<void> {
    if (chunk) await this.writer?.write(chunk)
  }

  protected async closeOutput(): Promise<void> {
    if (!this.writer) return
    try {
      if (this.status === ExportStatus.Completed) {
        await this.writer.close()
      } else {
        this.writer.destroy()
      }
    } finally {
      this.writer = undefined
    }
  }

  async getHeader(columns: TableColumn[]): Promise<string> {
    if (!columns?.length) return ''
    return this.writer.headerXml(columns.map((c) => c.columnName))
  }

  getFooter() { return '' }

  formatRow(row: any[]): string {
    const xml = this.writer.rowXml(row)
    if (xml === null) {
      this.truncated = true
      return ''
    }
    return xml
  }
}
