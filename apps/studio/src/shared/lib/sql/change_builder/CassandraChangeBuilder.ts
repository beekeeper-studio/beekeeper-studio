import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { CassandraData } from "@shared/lib/dialects/cassandra";
import { AlterTableSpec, Dialect, DropIndexSpec, SchemaItem, SchemaItemChange } from "@shared/lib/dialects/models";
import _ from 'lodash'

export class CassandraChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'cassandra'
  wrapIdentifier = CassandraData.wrapIdentifier
  wrapLiteral = CassandraData.wrapLiteral
  escapeString = CassandraData.escapeString


  existingColumns: SchemaItem[]
  constructor(table: string, existingColumns: SchemaItem[]) {
    super(table)
    this.existingColumns = existingColumns
  }
  
  defaultValue(defaultValue) {
    // FIXME: all taken from mysql change builder. Update as needed?
    // MySQL is a cluster when it comes to default values.
    if (!defaultValue) return null
    if (defaultValue === 'CURRENT_TIMESTAMP') return defaultValue
    if (defaultValue.toString().startsWith('(')) return defaultValue
    // string, already quoted
    if (defaultValue.startsWith("'")) return this.wrapLiteral(defaultValue)
    // string, not quoted.
    return this.escapeString(defaultValue.toString(), true);
  }

  // Cassandra doesn't seem to support database relations https://cassandra.apache.org/doc/latest/
  // dropRelations(names: string[]): string | null {
  //   // FIXME: all taken from mysql change builder. Update as needed?
  //   if (!names?.length) return null
  //   return names.map((name: string) => {
  //     const t = this.tableName
  //     const c = this.wrapIdentifier(name)
  //     return `ALTER TABLE ${t} DROP FOREIGN KEY ${c}`
  //   }).join(";")
  // }

  dropIndexes(drops: DropIndexSpec[]): string | null {
    // FIXME: all taken from mysql change builder. Update as needed?
    if (!drops?.length) return null
    return drops.map((spec) => {
      const name = this.wrapIdentifier(spec.name)
      return `DROP INDEX ${name} on ${this.tableName}`
    }).join(';')
  }

  ddl(existing: SchemaItem, updated: SchemaItem): string {
    // FIXME: all taken from mysql change builder. Update as needed?
    const column = existing.columnName
    const newName = updated.columnName
    const nameChanged = column !== newName

    return [
      nameChanged ? `CHANGE` : 'MODIFY',
      this.wrapIdentifier(column),
      nameChanged ? this.wrapIdentifier(newName) : null,
      updated.comment ? `COMMENT ${this.escapeString(updated.comment, true)}` : null,
    ].filter((c) => !!c).join(" ")
  }


  getExisting(column: string) {
    // FIXME: all taken from mysql change builder. Update as needed?
    const c: SchemaItem | undefined = this.existingColumns.find((c) => c.columnName === column)
    if (!c) {
      throw new Error(`Unable to find type for column ${column} in order to rename it`)
    }
    return c
  }

  buildUpdatedSchema(existing: SchemaItem, specs: SchemaItemChange[]) {
    // FIXME: all taken from mysql change builder. Update as needed?
    let result = { ...existing }
    specs.forEach((spec) => {
      if (spec.changeType === 'columnName') result = { ...result, columnName: spec.newValue.toString()}
    })
    return result
  }

  dropColumn(column: string) {
    return `DROP ${this.wrapIdentifier(column)}`
  }
  
  addColumn(item: SchemaItem) {
    if (!item.columnName || !item.dataType) {
      throw new Error("can't add a column without name or data type")
    }

    return [
      'ADD',
      this.wrapIdentifier(item.columnName),
      this.wrapLiteral(item.dataType)
    ].filter((i) => !!i).join(" ")
  }

  renameColumn(column: string, newName: string) {
    return `RENAME ${this.wrapIdentifier(column)} TO ${this.wrapIdentifier(newName)}`
  }

  alterTable(spec: AlterTableSpec): string {
    const beginning = `ALTER TABLE ${this.tableName}`
    /*
    From the documentation found at https://docs.datastax.com/en/cql/3.3/cql/cql_reference/cqlAlterTable.html
    Renaming a column
    The main purpose of RENAME is to change the names of CQL-generated primary key and column names that are missing from a legacy table. The following restrictions apply to the RENAME operation:
        You can only rename clustering columns, which are part of the primary key.
        You cannot rename the partition key.
        You can index a renamed column.
        You cannot rename a column if an index has been created on it.
        You cannot rename a static column, since you cannot use a static column in the table's primary key.
    */
    const renameColumnAlterations = spec.alterations?.filter(v => { v.changeType === 'columnName' })
    const alterations = [
      ...spec.adds?.map(v => this.addColumn(v)),
      ...spec.drops?.map(v => this.dropColumn(v))
    ].filter((i) => !_.isEmpty(i))

    const fullRenames = renameColumnAlterations
      .map(item => this.renameColumn(item.columnName, (item.newValue || '').toString()))
      .map((r) => `${beginning} ${r}`).join(";")
    
    const alterTable = alterations
      .map((a) => `${beginning} ${a}`)
      .join(';')

    const results = [
      alterTable,
      fullRenames
    ].filter((sql) => !!sql).join(';')
  
    return results.length ? `${results};` : null
  }

  alterColumns(specs: SchemaItemChange[]) {
    // FIXME: all taken from mysql change builder. Update as needed?
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
