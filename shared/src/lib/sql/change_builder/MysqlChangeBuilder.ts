import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { MysqlData } from "@shared/lib/dialects/mysql";
import { Dialect } from "@shared/lib/dialects/models";

interface LiteSchemaItem {
  columnName: string
  dataType: string
}

export class MySqlChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'mysql'
  wrapIdentifier = MysqlData.wrapIdentifier
  wrapLiteral = MysqlData.wrapLiteral
  escapeString = MysqlData.escapeString

  existingColumns: LiteSchemaItem[]
  constructor(table: string, existingColumns: LiteSchemaItem[]) {
    super(table)
    this.existingColumns = existingColumns
  }

  renameColumn(column: string, newName: string): string {

    const existingColumn = this.existingColumns.find((c) => c.columnName === column)
    const existingType = existingColumn?.dataType
    if (!existingType) {
      throw new Error(`Unable to find type for column ${column} in order to rename it`)
    }

    return [
      `CHANGE`,
      this.wrapIdentifier(column),
      this.wrapIdentifier(newName),
      existingType
    ].join(" ")
  }
}