import { AlterTableSpec, Dialect, DropIndexSpec, SchemaItem, SchemaItemChange } from "@shared/lib/dialects/models";
import { SqlAnywhereData } from "@shared/lib/dialects/anywhere";
import _ from "lodash";
import { ChangeBuilderBase } from "./ChangeBuilderBase";

interface LiteSchemaItem {
  columnName: string
  dataType: string
}

export class SqlAnywhereChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'sqlanywhere'
  existingColumns: LiteSchemaItem[]

  constructor(table: string, schema = 'dbo', existingColumns: LiteSchemaItem[]) {
    super(table, schema)
    this.existingColumns = existingColumns
  }

  wrapIdentifier = SqlAnywhereData.wrapIdentifier
  wrapLiteral = SqlAnywhereData.escapeString
  escapeString = SqlAnywhereData.escapeString

  renameColumn(column: string, newName: string): string {
    return `RENAME ${this.wrapIdentifier(column)} TO ${this.wrapIdentifier(newName)}`
  }

  // new columns
  addColumn(item: SchemaItem) {
    if (!item.columnName || !item.dataType) {
      throw new Error("can't add a column without name or data type")
    }

    return [
      'ADD',
      this.wrapIdentifier(item.columnName),
      this.wrapLiteral(item.dataType),
      item.nullable ? 'NULL' : 'NOT NULL',
      item.defaultValue ? `DEFAULT ${this.wrapLiteral(item.defaultValue)}` : null
    ].filter((i) => !!i).join(" ")
  }

  alterType(column: string, newType: string) {
    return `MODIFY ${this.wrapIdentifier(column)} ${this.wrapLiteral(newType)}`
  }

  alterNullable(column: string, nullable: boolean) {
    const direction = nullable ? 'NULL' : 'NOT NULL'
    return `MODIFY ${this.wrapIdentifier(column)} ${direction}`
  }

  alterDefault(column: string, newDefault: string | boolean | null) {
    if (newDefault === null) {
      return `ALTER ${this.wrapIdentifier(column)} DROP DEFAULT`
    } else {
      return `ALTER ${this.wrapIdentifier(column)} SET DEFAULT ${this.wrapLiteral(newDefault.toString())}`
    }
  }

  setComment(_column: string, _newComment: string) {
    return null
    // SQL Anywhere doesn't support column comments in the same way as other databases
  }

  ddl(existing: SchemaItem, updated: SchemaItem): string {
    if (!updated) return null
    const column = existing.columnName

    // For SQL Anywhere, we handle data type and nullability in separate statements
    return [
      'MODIFY',
      this.wrapIdentifier(column),
      updated.dataType,
      updated.nullable ? 'NULL' : 'NOT NULL',
    ].filter((c) => !!c).join(" ")
  }

  buildUpdatedSchema(existing: SchemaItem, specs: SchemaItemChange[]) {
    const updates = specs.filter((s) => ['dataType', 'nullable'].includes(s.changeType))
    if (!updates.length) return null
    let result = { ...existing }
    specs.forEach((spec) => {
      if (spec.changeType === 'dataType') result = { ...result, dataType: spec.newValue.toString() }
      if (spec.changeType === 'nullable') result = { ...result, nullable: !!spec.newValue }
    })
    return result
  }

  alterColumns(specs: SchemaItemChange[]) {
    const groupedByName = _.groupBy(specs, 'columnName')
    const existingGrouped = _.groupBy(this.existingColumns, 'columnName')

    const dataAndNullables = Object.keys(groupedByName).map((name) => {
      const changes = groupedByName[name];
      const existing = existingGrouped?.[name]?.[0];
      if (!existing) return null;
      const updated = this.buildUpdatedSchema(existing, changes)
      return this.ddl(existing, updated)
    }).filter((c) => !!c)

    const others = super.alterColumns(specs)
    return [...dataAndNullables, ...others]
  }

  dropIndexes(specs: DropIndexSpec[]) {
    if (!specs?.length) return null
    const names = specs.map((spec) => `${this.tableName}.${this.wrapIdentifier(spec.name)}`).join(", ")
    return `DROP INDEX ${names}`
  }
}
