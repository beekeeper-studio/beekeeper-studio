import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { MysqlData } from "@shared/lib/dialects/mysql";
import { Dialect, SchemaItem } from "@shared/lib/dialects/models";

export class MySqlChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'mysql'
  wrapIdentifier = MysqlData.wrapIdentifier
  wrapLiteral = MysqlData.wrapLiteral
  escapeString = MysqlData.escapeString


  existingColumns: SchemaItem[]
  constructor(table: string, existingColumns: SchemaItem[]) {
    super(table)
    this.existingColumns = existingColumns
  }
  
  alterColumn(c: SchemaItem, newName?: string): string {
    const column = c.columnName

    // mysql 5.7 only allows literal values except CURRENT_TIMESTAMP
    // mysql 8 allows literal values PLUS expressions like ('foo')
    // https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
    // it's very confusing.
    const d = (defaultValue) => {
      if (defaultValue === 'CURRENT_TIMESTAMP') return defaultValue
      if (defaultValue.toString().startsWith('(')) return defaultValue
      return this.escapeString(c.defaultValue.toString(), true);
    }

    return [
      newName ? `CHANGE` : 'MODIFY',
      this.wrapIdentifier(column),
      newName ? this.wrapIdentifier(newName) : null,
      c.dataType,
      c.defaultValue ? `DEFAULT ${d(c.defaultValue)}` : null,
      c.nullable ? 'NULL' : 'NOT NULL',
      c.extra,
      c.comment ? `COMMENT ${this.escapeString(c.comment, true)}` : null,
    ].filter((c) => !!c).join(" ")
  }


  getExisting(column: string) {
    const c: SchemaItem | undefined = this.existingColumns.find((c) => c.columnName === column)
    if (!c) {
      throw new Error(`Unable to find type for column ${column} in order to rename it`)
    }
    return c
  }


  renameColumn(column: string, newName: string): string {

    const c = this.getExisting(column)
    return this.alterColumn(c, newName)
  }

  alterNullable(column, newNullable) {
    const c = this.getExisting(column)
    const newSchema = {...c, nullable: newNullable}
    return this.alterColumn(newSchema)
  }

  alterDefault(column, newDefault) {
    const c = this.getExisting(column)
    const newSchema: SchemaItem = { ...c, defaultValue: newDefault}
    return this.alterColumn(newSchema)
  }

  alterType(column, newType) {
    const c = this.getExisting(column)
    const newSchema = { ...c, dataType: newType }
    return this.alterColumn(newSchema)
  }

  setComment(_table: string, column: string, comment: string) {
    const c = this.getExisting(column)
    const newSchema = { ...c, comment, }
    return this.alterColumn(newSchema)
  }

}