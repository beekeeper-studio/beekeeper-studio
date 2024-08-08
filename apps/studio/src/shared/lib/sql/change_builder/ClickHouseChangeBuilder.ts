import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { ClickHouseData } from "@shared/lib/dialects/clickhouse";
import { Dialect, SchemaItem } from "@shared/lib/dialects/models";
// import { CreateIndexSpec, Dialect, DropIndexSpec, SchemaItem, SchemaItemChange } from "@shared/lib/dialects/models";
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
    console.log(columnInfo)
    if (columnInfo.nullable) {
      const re = /^Nullable\((.*)\)$/
      const match = re.exec(dataType)
      dataType = match?.[1]
    }
    return `ALTER COLUMN ${this.wrapIdentifier(column)} TYPE ${nullable ? `Nullable(${dataType})` : dataType}`
  }

  // existingColumns: SchemaItem[]
  // constructor(table: string, existingColumns: SchemaItem[]) {
  //   super(table)
  //   this.existingColumns = existingColumns
  // }
  //
  // defaultValue(defaultValue?: string) {
  //   if (!defaultValue) return null
  //   if (defaultValue === 'CURRENT_TIMESTAMP') return defaultValue
  //   if (defaultValue.toString().startsWith('(')) return defaultValue
  //   // string, already quoted
  //   if (defaultValue.startsWith("'")) return this.wrapLiteral(defaultValue)
  //   // string, not quoted.
  //   return this.escapeString(defaultValue.toString(), true);
  // }
  //
  // singleIndex(spec: CreateIndexSpec): string {
  //   const unique = spec.unique ? 'UNIQUE' : ''
  //   const name = spec.name ? this.dialectData.wrapIdentifier(spec.name) : ''
  //   const table = this.tableName
  //   if (!spec.columns?.length) {
  //     throw new Error("Indexes require at least one column")
  //   }
  //   const columns = spec.columns?.map((c) => {
  //     if (!_.isNil(c.prefix)) {
  //       return `${this.dialectData.wrapIdentifier(c.name)} (${c.prefix}) ${c.order}`
  //     }
  //     return `${this.dialectData.wrapIdentifier(c.name)} ${c.order}`
  //   })
  //   return `
  //     CREATE ${unique} INDEX ${name} on ${table}(${columns})
  //   `
  // }
  //
  // dropRelations(names: string[]): string | null {
  //   if (!names?.length) return null
  //   return names.map((name: string) => {
  //     const t = this.tableName
  //     const c = this.wrapIdentifier(name)
  //     return `ALTER TABLE ${t} DROP FOREIGN KEY ${c}`
  //   }).join(";")
  // }
  //
  // dropIndexes(drops: DropIndexSpec[]): string | null {
  //   if (!drops?.length) return null
  //   return drops.map((spec) => {
  //     const name = this.wrapIdentifier(spec.name)
  //     return `DROP INDEX ${name} on ${this.tableName}`
  //   }).join(';')
  // }
  //
  // ddl(existing: SchemaItem, updated: SchemaItem): string {
  //   const column = existing.columnName
  //   const newName = updated.columnName
  //   const nameChanged = column !== newName
  //
  //   // mysql 5.7 only allows literal values except CURRENT_TIMESTAMP
  //   // mysql 8 allows literal values PLUS expressions like ('foo')
  //   // https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
  //   // it's very confusing.
  //
  //   return [
  //     nameChanged ? `CHANGE` : 'MODIFY',
  //     this.wrapIdentifier(column),
  //     nameChanged ? this.wrapIdentifier(newName) : null,
  //     updated.dataType,
  //     updated.defaultValue ? `DEFAULT ${this.defaultValue(updated.defaultValue)}` : null,
  //     updated.nullable ? 'NULL' : 'NOT NULL',
  //     updated.extra,
  //     updated.comment ? `COMMENT ${this.escapeString(updated.comment, true)}` : null,
  //   ].filter((c) => !!c).join(" ")
  // }
  //
  //
  // getExisting(column: string) {
  //   const c: SchemaItem | undefined = this.existingColumns.find((c) => c.columnName === column)
  //   if (!c) {
  //     throw new Error(`Unable to find type for column ${column} in order to rename it`)
  //   }
  //   return c
  // }
  //
  // buildUpdatedSchema(existing: SchemaItem, specs: SchemaItemChange[]) {
  //   let result = { ...existing }
  //   specs.forEach((spec) => {
  //     if (spec.changeType === 'columnName') result = { ...result, columnName: spec.newValue.toString()}
  //     if (spec.changeType === 'dataType') result = { ...result, dataType: spec.newValue.toString()}
  //     if (spec.changeType === 'defaultValue') result = { ...result, defaultValue: spec.newValue.toString()}
  //     if (spec.changeType === 'nullable') result = { ...result, nullable: !!spec.newValue}
  //     if (spec.changeType === 'comment') result = { ...result, comment: spec.newValue.toString()}
  //     if (spec.changeType === 'extra') result = { ...result, extra: spec.newValue.toString()}
  //   })
  //   return result
  // }
  //
  // alterColumns(specs: SchemaItemChange[]) {
  //   const groupedByName = _.groupBy(specs, 'columnName')
  //   const existingGrouped = _.groupBy(this.existingColumns, 'columnName')
  //
  //   return Object.keys(groupedByName).map((name) => {
  //     const changes = groupedByName[name];
  //     const existing = existingGrouped?.[name]?.[0];
  //     if (!existing) return null;
  //     const updated = this.buildUpdatedSchema(existing, changes)
  //     return this.ddl(existing, updated)
  //   }).filter((c)=> !!c)
  //
  // }
  //
  // renames() {
  //   // return nothing, do it all in alterColumns:
  //   return []
  // }
  //
  // alterComments() {
  //   // return nothing, do it all in alterColumns
  //   return []
  // }
}
