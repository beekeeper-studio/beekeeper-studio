import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { Export } from "@/lib/export";
import { TableFilter, TableOrView } from "../../db/models";
import { ExportOptions } from "../models";

export class JsonLineExporter extends Export {
  public static extension = "jsonl"
  readonly format: string = 'jsonl'
  rowSeparator = '\n'

  constructor(
    filePath: string,
    connection: BasicDatabaseClient<any>,
    table: TableOrView,
    query: string,
    queryName: string,
    filters: TableFilter[] | any[],
    options: ExportOptions,
    managerNotify: boolean = true
  ) {
    super(filePath, connection, table, query, queryName, filters, options,managerNotify)
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
