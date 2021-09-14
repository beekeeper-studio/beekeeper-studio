import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { MysqlData } from "@shared/lib/dialects/mysql";
import { Dialect, SchemaItem, SchemaItemChange } from "@shared/lib/dialects/models";
import _ from 'lodash'

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
  
  defaultValue(defaultValue) {
    // MySQL is a cluster when it comes to default values.
    if (!defaultValue) return null
    if (defaultValue === 'CURRENT_TIMESTAMP') return defaultValue
    if (defaultValue.toString().startsWith('(')) return defaultValue
    // string, already quoted
    if (defaultValue.startsWith("'")) return this.wrapLiteral(defaultValue)
    // string, not quoted.
    return this.escapeString(defaultValue.toString(), true);
  }

  dropRelations(names: string[]): string | null {
    if (!names?.length) return null
    return names.map((name: string) => {
      const t = this.tableName
      const c = this.wrapIdentifier(name)
      return `ALTER TABLE ${t} DROP FOREIGN KEY ${c}`
    }).join(";")
  }

  ddl(existing: SchemaItem, updated: SchemaItem): string {
    const column = existing.columnName
    const newName = updated.columnName
    const nameChanged = column !== newName

    // mysql 5.7 only allows literal values except CURRENT_TIMESTAMP
    // mysql 8 allows literal values PLUS expressions like ('foo')
    // https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
    // it's very confusing.

    return [
      nameChanged ? `CHANGE` : 'MODIFY',
      this.wrapIdentifier(column),
      nameChanged ? this.wrapIdentifier(newName) : null,
      updated.dataType,
      updated.defaultValue ? `DEFAULT ${this.defaultValue(updated.defaultValue)}` : null,
      updated.nullable ? 'NULL' : 'NOT NULL',
      updated.extra,
      updated.comment ? `COMMENT ${this.escapeString(updated.comment, true)}` : null,
    ].filter((c) => !!c).join(" ")
  }


  getExisting(column: string) {
    const c: SchemaItem | undefined = this.existingColumns.find((c) => c.columnName === column)
    if (!c) {
      throw new Error(`Unable to find type for column ${column} in order to rename it`)
    }
    return c
  }

  buildUpdatedSchema(existing: SchemaItem, specs: SchemaItemChange[]) {
    let result = { ...existing }
    specs.forEach((spec) => {
      if (spec.changeType === 'columnName') result = { ...result, columnName: spec.newValue.toString()}
      if (spec.changeType === 'dataType') result = { ...result, dataType: spec.newValue.toString()}
      if (spec.changeType === 'defaultValue') result = { ...result, defaultValue: spec.newValue.toString()}
      if (spec.changeType === 'nullable') result = { ...result, nullable: !!spec.newValue}
      if (spec.changeType === 'comment') result = { ...result, comment: spec.newValue.toString()}
      if (spec.changeType === 'extra') result = { ...result, extra: spec.newValue.toString()}
    })
    return result
  }

  alterColumns(specs: SchemaItemChange[]) {
    const groupedByName = _.groupBy(specs, 'columnName')
    const existingGrouped = _.groupBy(this.existingColumns, 'columnName')

    return Object.keys(groupedByName).map((name) => {
      const changes = groupedByName[name];
      const existing = existingGrouped?.[name]?.[0];
      if (!existing) return null;
      const updated = this.buildUpdatedSchema(existing, changes)
      return this.ddl(existing, updated)
    }).filter((c)=> !!c)

  }

  renames() {
    // return nothing, do it all in alterColumns:
    return []
  }

  alterComments() {
    // return nothing, do it all in alterColumns
    return []
  }

}