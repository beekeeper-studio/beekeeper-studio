import { Export } from "@/lib/export";
import { DBConnection } from '@/lib/db/client'
import indentString from 'indent-string'
import { TableFilter, TableOrView } from "../../db/models";
import { ExportOptions } from "../models";

interface OutputOptionsJson {
  prettyprint: boolean
}
export class JsonExporter extends Export {
  public static extension: string = "json"
  readonly format: string = 'json'
  rowSeparator: string = ',\n'
  outputOptions: OutputOptionsJson;

  constructor(
    filePath: string,
    connection: DBConnection,
    table: TableOrView,
    filters: TableFilter[] | any[],
    options: ExportOptions,
    outputOptions: OutputOptionsJson
  ) {
    super(filePath, connection, table, filters, options)
    this.outputOptions = outputOptions
  }

  async getHeader(): Promise<string> {
    return '[\n'
  }

  getFooter() {
    return ']'
  }

  formatRow(rowArray: any[]): string {
    const row = this.rowToObject(rowArray)
    const spacing = this.outputOptions.prettyprint ? 2 : undefined
    const content = indentString(JSON.stringify(row, null, spacing), 2)
    return content
  }
}
