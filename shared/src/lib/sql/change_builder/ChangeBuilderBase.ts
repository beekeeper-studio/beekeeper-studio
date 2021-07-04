import { AlterTableSpec, SchemaItem, SchemaItemChange } from "@shared/lib/dialects/models";
import _ from "lodash";

export abstract class ChangeBuilderBase {

  table: string
  schema?: string
  constructor(table: string, schema?: string){
    this.table = table
    this.schema = schema
  }

  get tableName(): string{
    return this.schema ? `${this.wrapIdentifier(this.schema)}.${this.wrapIdentifier(this.table)}` : this.wrapIdentifier(this.table)
  }

  // column alteration
  alterType(column: string, newType: string) {
    return `ALTER COLUMN ${this.wrapIdentifier(column)} TYPE ${this.wrapLiteral(newType)}`
  }

  alterDefault(column: string, newDefault: string) {
    return `ALTER COLUMN ${this.wrapIdentifier(column)} SET DEFAULT ${this.wrapLiteral(newDefault)}`
  }

  alterNullable(column, nullable: boolean) {
    const direction = nullable ? 'DROP' : 'SET'
    return `ALTER COLUMN ${this.wrapIdentifier(column)} ${direction} NOT NULL`
  }
  // this works in some databases.
  renameColumn(column: string, newName: string) {
    return `RENAME COLUMN ${this.wrapIdentifier(column)} TO ${this.wrapIdentifier(newName)}`
  }

  setComment(tableName, column: string, newComment: string) {
    return `COMMENT ON COLUMN ${tableName}.${this.wrapIdentifier(column)} IS '${this.escapeString(newComment)}'`
  }

  dropColumn(column: string) {
    return `DROP COLUMN ${this.wrapIdentifier(column)}`
  }

  // new columns
  addColumn(item: SchemaItem) {
    return [
      'ADD COLUMN',
      this.wrapIdentifier(item.columnName),
      this.wrapLiteral(item.dataType),
      item.nullable ? 'NULL' : 'NOT NULL',
      item.defaultValue ? `DEFAULT ${this.wrapLiteral(item.defaultValue)}` : null
    ].filter((i) => !!i).join(" ")
  }
  addColumns(items: SchemaItem[]) {
    return items.map((item) => this.addColumn(item)).join(", ")
  }

  dropColumns(items: string[]) {
    return items.map((i) => this.dropColumn(i)).join(", ")
  }

  alterComments(items: SchemaItemChange[]) {
    return items.filter((i) => i.changeType === 'comment').map((item) => {
      return this.setComment(this.tableName, item.columnName, item.newValue.toString())
    }).join(";")
  }

  alterColumns(items: SchemaItemChange[]) {
    return items.map((item) => {
      switch (item.changeType) {
        case 'columnName':
          return this.renameColumn(item.columnName, item.newValue.toString())
        case 'dataType':
          return this.alterType(item.columnName, item.newValue.toString())
        case 'defaultValue':
          return this.alterDefault(item.columnName, item.newValue.toString())
        case 'nullable':
          return this.alterNullable(item.columnName, !!item.newValue)
        default:
          return null
      }
    }).filter((s) => !!s).join(", ")
  }

  abstract wrapIdentifier(str: string): string
  abstract wrapLiteral(str: string): string
  abstract escapeString(str: string): string

  alterTable(spec: AlterTableSpec): string {
    const beginning = `ALTER TABLE ${this.tableName}`
    const alterations = [
      this.addColumns(spec.inserts),
      this.dropColumns(spec.deletes),
      this.alterColumns(spec.updates)
    ].filter((i) => !_.isEmpty(i))
    const alterTable = `${beginning} ${alterations.join(", ")}`
    const results = [
      alterTable,
      this.alterComments(spec.updates)
    ].join(";")
    return results
  }
}