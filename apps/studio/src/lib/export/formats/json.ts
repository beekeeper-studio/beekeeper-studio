import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { Export } from "@/lib/export";
import indentString from 'indent-string'
import { TableFilter, TableOrView } from "../../db/models";
import { ExportOptions } from "../models";

interface OutputOptionsJson {
  prettyprint: boolean
}
export class JsonExporter extends Export {
  public static extension = "json"
  readonly format: string = 'json'
  rowSeparator = ',\n'
  needsFinalSeparator = false
  outputOptions: OutputOptionsJson;

  constructor(
    filePath: string,
    connection: BasicDatabaseClient<any>,
    table: TableOrView,
    query: string,
    queryName: string,
    filters: TableFilter[] | any[],
    options: ExportOptions,
    outputOptions: OutputOptionsJson,
    managerNotify: boolean = true
  ) {
    super(filePath, connection, table, query, queryName, filters, options, managerNotify)
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
