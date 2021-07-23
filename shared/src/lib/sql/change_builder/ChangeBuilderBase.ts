import { getDialectData } from "@shared/lib/dialects";
import { AlterTableSpec, Dialect, DialectData, SchemaItem, SchemaItemChange } from "@shared/lib/dialects/models";
import _ from "lodash";

export abstract class ChangeBuilderBase {

  table: string
  schema?: string
  abstract dialect: Dialect
  private _data: DialectData
  constructor(table: string, schema?: string){
    this.table = table
    this.schema = schema
  }

  get dialectData() {
    if (!this._data) this._data = getDialectData(this.dialect)
    return this._data
  }

  get tableName(): string{
    return this.schema ? `${this.wrapIdentifier(this.schema)}.${this.wrapIdentifier(this.table)}` : this.wrapIdentifier(this.table)
  }

  // column alteration
  alterType(column: string, newType: string) {
    return `ALTER COLUMN ${this.wrapIdentifier(column)} TYPE ${this.wrapLiteral(newType)}`
  }

  alterDefault(column: string, newDefault: string | boolean | null) {
    if (newDefault === null) {
      return `ALTER COLUMN ${this.wrapIdentifier(column)} DROP DEFAULT`
    } else {
      return `ALTER COLUMN ${this.wrapIdentifier(column)} SET DEFAULT ${this.wrapLiteral(newDefault.toString())}`
    }

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

    if (!item.columnName || !item.dataType) {
      throw new Error("can't add a column without name or data type")
    }

    return [
      'ADD COLUMN',
      this.wrapIdentifier(item.columnName),
      this.wrapLiteral(item.dataType),
      item.nullable ? 'NULL' : 'NOT NULL',
      item.defaultValue ? `DEFAULT ${this.wrapLiteral(item.defaultValue)}` : null
    ].filter((i) => !!i).join(" ")
  }
  addColumns(items: SchemaItem[]): string[] {
    if (this.dialectData.disabledFeatures?.alter?.addColumn) return []
    return items.map((item) => this.addColumn(item))
  }

  dropColumns(items: string[]): string[] {
    if (this.dialectData.disabledFeatures?.alter?.dropColumn) return []
    return items.map((i) => this.dropColumn(i))
  }

  alterComments(items: SchemaItemChange[]): string[] {
    if (this.dialectData.disabledFeatures?.comments) return []
    return items.filter((i) => i.changeType === 'comment').map((item) => {
      return this.setComment(this.tableName, item.columnName, item.newValue.toString())
    })
  }

  get disabledAlter() {
    return !!this.dialectData.disabledFeatures?.alter?.alterColumn
  }

  get disabledRename() {
    return !!this.dialectData.disabledFeatures?.alter?.renameColumn
  } 

  nameFilter = () => this.disabledRename ? (i: SchemaItemChange) => i.changeType !== 'columnName' : () => true
  alterFilter = () => this.disabledAlter ? (i: SchemaItemChange) => i.changeType === 'columnName' : () => true


  renames(items: SchemaItemChange[]) {
    return items.filter(this.nameFilter).filter(this.alterFilter).filter((c) => c.changeType === 'columnName').map((item) => {
      return this.renameColumn(item.columnName, (item.newValue || '').toString())
    }).filter((i) => !!i)
  }

  alterColumns(items: SchemaItemChange[]): string[] {

    // these filters make sure we don't build SQL for disabled features.


    return items.filter(this.nameFilter).filter(this.alterFilter).map((item) => {
      switch (item.changeType) {
        case 'columnName':
          return null
        case 'dataType':
          return this.alterType(item.columnName, (item.newValue || '').toString())
        case 'defaultValue':
          return this.alterDefault(item.columnName, item.newValue)
        case 'nullable':
          return this.alterNullable(item.columnName, !!item.newValue)
        default:
          return null
      }
    }).filter((s) => !!s)
  }

  abstract wrapIdentifier(str: string): string
  abstract wrapLiteral(str: string): string 
  abstract escapeString(str: string, quote?: boolean): string


  initialSql(_spec: AlterTableSpec): string | null {
    return null
  }

  endSql(_spec: AlterTableSpec): string | null {
    return null
  }

  get multiStatementMode(): boolean {
    return !!this.dialectData.disabledFeatures?.alter?.multiStatement
  }


  alterTable(spec: AlterTableSpec): string {
    const initial = this.initialSql(spec)
    const end = this.endSql(spec)
    const beginning = `ALTER TABLE ${this.tableName}`
    const alterations = [
      ...this.addColumns(spec.adds || []),
      ...this.dropColumns(spec.drops || []),
      ...this.alterColumns(spec.alterations || [])
    ].filter((i) => !_.isEmpty(i))

    const renames = this.renames(spec.alterations || [])
    const fullRenames = renames.map((r) => `${beginning} ${r}`).join(";")

    let alterTable = alterations.length ? `${beginning} ${alterations.join(", ")}` : null

    // some dbs (SQLITE) don't support multiple operations in a single ALTER
    if (this.multiStatementMode) {
      alterTable = alterations.map((a) => {
        return `${beginning} ${a}`
      }).join(';')
    }

    const results = [
      initial,
      alterTable,
      fullRenames,
      this.alterComments(spec.alterations || []),
      end
    ].filter((sql) => !!sql).join(";")
    if (results.length) {
      return results.endsWith(';') ? results : `${results};`
    } else {
      return null
    }
  }
}