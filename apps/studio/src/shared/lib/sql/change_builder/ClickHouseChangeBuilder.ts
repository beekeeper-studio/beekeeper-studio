import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { ClickHouseData } from "@shared/lib/dialects/clickhouse";
import { Dialect, SchemaItem } from "@shared/lib/dialects/models";
import _ from 'lodash'

export class ClickHouseChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'clickhouse'
  wrapIdentifier = ClickHouseData.wrapIdentifier
  wrapLiteral = ClickHouseData.wrapLiteral
  escapeString = ClickHouseData.escapeString

  constructor(table: string, schema: string, private columns: SchemaItem[]) {
    super(table, schema)
  }

  // new columns
  addColumn(item: SchemaItem) {
    if (!item.columnName || !item.dataType) {
      throw new Error("can't add a column without name or data type")
    }

    let dataType = this.wrapLiteral(item.dataType)
    if (item.nullable) {
      dataType = `Nullable(${dataType})`
    }

    return [
      'ADD COLUMN',
      this.wrapIdentifier(item.columnName),
      dataType,
      item.defaultValue ? `DEFAULT ${this.wrapLiteral(item.defaultValue)}` : null,
      item.extra,
      item.comment ? `COMMENT ${this.escapeString(item.comment, true)}` : null
    ].filter((i) => !!i).join(" ")
  }

  alterDefault(column: string, newDefault: string | boolean | null) {
    if (newDefault === null) {
      return `ALTER COLUMN ${this.wrapIdentifier(column)} REMOVE DEFAULT`
    } else {
      return `ALTER COLUMN ${this.wrapIdentifier(column)} DEFAULT ${this.wrapLiteral(newDefault.toString())}`
    }
  }

  alterNullable(column: string, nullable: boolean) {
    const columnInfo = this.columns.find((c) => c.columnName === column)
    let dataType = columnInfo.dataType
    if (columnInfo.nullable) {
      const re = /^Nullable\((.*)\)$/
      const match = re.exec(dataType)
      dataType = match?.[1]
    }
    return `ALTER COLUMN ${this.wrapIdentifier(column)} TYPE ${nullable ? `Nullable(${dataType})` : dataType}`
  }
}
