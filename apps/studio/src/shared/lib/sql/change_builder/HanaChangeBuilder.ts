import { Dialect, SchemaItem } from "@shared/lib/dialects/models";
import { HanaData } from "@shared/lib/dialects/hana";
import { ChangeBuilderBase } from "./ChangeBuilderBase";

export class HanaChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'hana'

  constructor(table: string, schema: string) {
    super(table, schema)
  }

  wrapIdentifier = HanaData.wrapIdentifier
  wrapLiteral = HanaData.wrapLiteral
  escapeString = HanaData.escapeString

  renameColumn(column: string, newName: string): string {
    return `RENAME COLUMN ${this.tableName}.${this.wrapIdentifier(column)} TO ${this.wrapIdentifier(newName)}`
  }

  // HANA wraps ADD/ALTER column clauses in parentheses:
  // ALTER TABLE t ADD (col NVARCHAR(10) NOT NULL)
  addColumn(item: SchemaItem) {
    if (!item.columnName || !item.dataType) {
      throw new Error("can't add a column without name or data type")
    }

    return `ADD (${[
      this.wrapIdentifier(item.columnName),
      this.wrapLiteral(item.dataType),
      item.defaultValue ? `DEFAULT ${this.wrapLiteral(item.defaultValue)}` : null,
      item.nullable ? 'NULL' : 'NOT NULL',
    ].filter((i) => !!i).join(" ")})`
  }

  alterType(column: string, newType: string) {
    return `ALTER (${this.wrapIdentifier(column)} ${this.wrapLiteral(newType)})`
  }

  alterNullable(column: string, nullable: boolean) {
    const existingType = this.existingColumnType(column)
    return `ALTER (${this.wrapIdentifier(column)} ${existingType} ${nullable ? 'NULL' : 'NOT NULL'})`
  }

  alterDefault(column: string, newDefault: string | boolean | null) {
    const existingType = this.existingColumnType(column)
    if (newDefault === null) {
      return `ALTER (${this.wrapIdentifier(column)} ${existingType} DEFAULT NULL)`
    }
    return `ALTER (${this.wrapIdentifier(column)} ${existingType} DEFAULT ${this.wrapLiteral(newDefault.toString())})`
  }

  setComment(column: string, newComment: string) {
    return `COMMENT ON COLUMN ${this.tableName}.${this.wrapIdentifier(column)} IS ${this.escapeString(newComment, true)}`
  }

  // HANA's ALTER (col ...) clauses need the current data type repeated. The
  // stage-1 UI disables alters, so existing column types aren't tracked yet.
  private existingColumnType(_column: string): string {
    throw new Error("Altering columns is not supported for SAP HANA")
  }
}
