import { ExtendedTableColumn } from "@/lib/db/models";
import { getDialectData } from "@shared/lib/dialects";
import { AlterTableSpec, CreateIndexSpec, CreateRelationSpec, Dialect, DialectData, DropIndexSpec, SchemaItem, SchemaItemChange } from "@shared/lib/dialects/models";
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
    return this.buildTableName(this.table, this.schema);
  }

  buildTableName(table: string, schema?: string) {
    return schema ? `${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)}` : this.wrapIdentifier(table)
  }

  join(...parts: string[]) {
    return `${parts.map((p) => this.wrapIdentifier(p)).join(".")}`
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

  alterNullable(column: string, nullable: boolean) {
    const direction = nullable ? 'DROP' : 'SET'
    return `ALTER COLUMN ${this.wrapIdentifier(column)} ${direction} NOT NULL`
  }
  // this works in some databases.
  renameColumn(column: string, newName: string) {
    return `RENAME COLUMN ${this.wrapIdentifier(column)} TO ${this.wrapIdentifier(newName)}`
  }

  setComment(column: string, newComment: string) {
    return `COMMENT ON COLUMN ${this.tableName}.${this.wrapIdentifier(column)} IS '${this.escapeString(newComment)}'`
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
      item.defaultValue ? `DEFAULT ${this.wrapLiteral(item.defaultValue)}` : null,
      item.nullable ? 'NULL' : 'NOT NULL',
      item.extra,
      item.comment ? `COMMENT ${this.escapeString(item.comment, true)}` : null
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
      return this.setComment(item.columnName, item.newValue.toString())
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
    // need to add the 'alter table' portion at the beginning of each of these
    const reorderColumns = spec.reorder ? this.reorderColumns(spec.reorder.oldOrder, spec.reorder.newOrder) : null
    let alterTable = alterations.length ? `${beginning} ${alterations.join(", ")}` : null

    // some dbs (SQLITE) don't support multiple operations in a single ALTER
    if (this.multiStatementMode) {
      alterTable = alterations.map((a) => {
        return `${beginning} ${a}`
      }).join(';')
    }

    // for most databases (excluding mysql)
    // renames and comments happen outside the core ALTER COLUMN statement.
    // eg psql SET COMMENT ON COLUMN, sql server is a stored procedure.
    const results = [
      initial,
      alterTable,
      fullRenames,
      this.alterComments(spec.alterations || []).join(";"),
      reorderColumns,
      end
    ].filter((sql) => !!sql).join(";")
    if (results.length) {
      return results.endsWith(';') ? results : `${results};`
    } else {
      return null
    }
  }


  singleIndex(spec: CreateIndexSpec): string {
    const unique = spec.unique ? 'UNIQUE' : ''
    const name = spec.name ? this.dialectData.wrapIdentifier(spec.name) : ''
    const table = this.tableName
    if (!spec.columns?.length) {
      throw new Error("Indexes require at least one column")
    }
    const columns = spec.columns?.map((c) => {
      return `${this.dialectData.wrapIdentifier(c.name)} ${c.order}`
    })
    return `
      CREATE ${unique} INDEX ${name} on ${table}(${columns})
    `
  }

  createIndexes(specs: CreateIndexSpec[]): string | null {
    if (!specs?.length) return null
    return specs.map((spec) => this.singleIndex(spec)).join(";");
  }

  dropIndexes(drops: DropIndexSpec[]): string | null {
    if (!drops?.length) return null

    const names = drops.map((spec) => this.dialectData.wrapIdentifier(spec.name)).join(",")
    return names.length ? `DROP INDEX ${names}` : null
  }

  singleRelation(spec: CreateRelationSpec): string {

    const fromTable = this.tableName
    const fkName = spec.constraintName ? this.wrapIdentifier(spec.constraintName) : ''
    const toTable = this.buildTableName(spec.toTable, spec.toSchema)
    const fromColumn = this.wrapIdentifier(spec.fromColumn)
    const toColumn = this.wrapIdentifier(spec.toColumn)
    const onUpdate = spec.onUpdate ? `ON UPDATE ${this.wrapLiteral(spec.onUpdate)}` : ''
    const onDelete = spec.onDelete ? `ON DELETE ${this.wrapLiteral(spec.onDelete)}` : ''

    const result = `
      ALTER TABLE ${fromTable}
      ADD CONSTRAINT ${fkName}
      FOREIGN KEY (${fromColumn})
      REFERENCES ${toTable} (${toColumn})
      ${onUpdate}
      ${onDelete}
    `
    return result
  }

  createRelations(specs: CreateRelationSpec[]): string | null {
    if (!specs?.length) return null
    return specs.map((spec) => this.singleRelation(spec)).join(";")
  }

  // shouldn't be abstract because not all clients support reordering a column
  reorderColumns(_oldColumnOrder: ExtendedTableColumn[], _newColumnOrder: ExtendedTableColumn[]): string {
    throw new Error('reorderColumns must be added via a subclass')
  }

  dropRelations(names: string[]): string | null {
    if (!names?.length) return null

    return names.map((name: string) => {
      const t = this.tableName
      const c = this.wrapIdentifier(name)
      return `ALTER TABLE ${t} DROP CONSTRAINT ${c}`
    }).join(";")
  }
}
