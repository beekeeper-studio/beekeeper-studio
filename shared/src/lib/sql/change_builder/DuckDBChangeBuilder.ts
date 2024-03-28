import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { DuckDBData as D } from "@shared/lib/dialects/duckdb";
import { Dialect, SchemaItem } from "@shared/lib/dialects/models";

export class DuckDBChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'duckdb'
  wrapIdentifier = D.wrapIdentifier
  wrapLiteral = D.wrapLiteral
  escapeString = D.escapeString

  addColumn(item: SchemaItem) {
    if (!item.columnName || !item.dataType) {
      throw new Error("can't add a column without name or data type")
    }

    return [
      'ADD COLUMN',
      this.wrapIdentifier(item.columnName),
      this.wrapIdentifier(item.dataType),
      item.defaultValue ? `DEFAULT ${this.wrapLiteral(item.defaultValue)}` : null,
      item.nullable ? 'NULL' : 'NOT NULL',
      item.extra,
    ].filter((i) => !!i).join(" ")
  }
}
