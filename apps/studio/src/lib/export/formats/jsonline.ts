import { Export } from "@/lib/export";
import { DBConnection } from '@/lib/db/client'
import { TableFilter, TableOrView } from "../../db/models";
import { ExportOptions } from "../models";

export class JsonLineExporter extends Export {
  public static extension: string = "jsonl"
  readonly format: string = 'jsonl'
  rowSeparator: string = '\n'

  constructor(
    filePath: string,
    connection: DBConnection,
    table: TableOrView,
    query: string,
    query_name: string,
    filters: TableFilter[] | any[],
    options: ExportOptions
  ) {
    super(filePath, connection, table, query, query_name, filters, options)
  }

  async getHeader(): Promise<string> {
    return ''
  }

  getFooter() {
    return ''
  }

  formatRow(rowArray: any[]): string {
    const row = this.rowToObject(rowArray)
    const content = JSON.stringify(row)
    return content
  }
}
