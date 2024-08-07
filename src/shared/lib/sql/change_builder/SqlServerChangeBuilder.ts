import { AlterTableSpec, Dialect, DropIndexSpec, SchemaItem, SchemaItemChange } from "@shared/lib/dialects/models";
import { DefaultConstraint, SqlServerData } from "@shared/lib/dialects/sqlserver";
import _ from "lodash";
import { ChangeBuilderBase } from "./ChangeBuilderBase";

interface LiteSchemaItem {
  columnName: string
  dataType: string
}


export class SqlServerChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'sqlserver'
  defaultConstraints: DefaultConstraint[]
  existingColumns: LiteSchemaItem[]

  constructor(table: string, schema = 'dbo', existingColumns: LiteSchemaItem[],  defaultConstraints: DefaultConstraint[] ) {
    super(table, schema)
    this.defaultConstraints = defaultConstraints
    this.existingColumns = existingColumns
  }

  wrapIdentifier = SqlServerData.wrapIdentifier
  wrapLiteral = SqlServerData.wrapLiteral
  escapeString = SqlServerData.escapeString

  renameColumn(): string | null {
    return null
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

  // we handle these two in the `DDL` method
  alterType() {
    return null
  }

  alterNullable() {
    return null
  }


  alterDefault(column: string, newDefault: string | boolean | null) {
    // we drop the default in the initialSql
    const newValue = newDefault ? this.wrapLiteral(newDefault.toString()) : null
    return `ADD DEFAULT ${newValue} FOR ${this.wrapIdentifier(column)}`
  }

  setComment(_column: string, _newComment: string) {
    return null
    // TODO (matthew): Before this can work you need to know if the column already has a comment
    // you have to run sp_addextendedproperty if no comment exists.
    // return `
    //   EXEC sp_updateextendedproperty
    //     @name = N'MS_Description',
    //     @value = N${this.escapeString(newComment, true)},
    //     @level0type = N'SCHEMA', @level0name = ${this.wrapIdentifier(this.schema)},
    //     @level1type = N'TABLE',  @level1name = ${this.wrapIdentifier(tableName)},
    //     @level2type = N'COLUMN', @level2name = ${this.wrapIdentifier(column)};
    // `
  }

  ddl(existing: SchemaItem, updated: SchemaItem): string {
    if (!updated) return null
    const column = existing.columnName

    return [
      'ALTER COLUMN',
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

  initialSql(spec: AlterTableSpec) {
    const defaults = (spec.alterations || []).filter((a) => a.changeType === 'defaultValue')
    const results = defaults.map((change) => {
      const existing = this.getDefaultConstraint(change.columnName)
      if (!existing) return null
      return `DROP CONSTRAINT ${this.wrapIdentifier(existing.name)}`
    }).filter((f) => !!f)

    if (!results.length) return null;
    return `ALTER TABLE ${this.tableName} ${results.join("\n")}`
  }

  endSql(spec: AlterTableSpec) {
    return (spec.alterations || []).filter((a) => a.changeType === 'columnName').map((a) => {
      return `EXEC sp_rename '${this.escapeString(this.tableName)}.${this.escapeString(this.wrapIdentifier(a.columnName))}', '${this.escapeString(a.newValue.toString())}', 'COLUMN'`
    }).join(";")
  }

  getDefaultConstraint(column: string): DefaultConstraint | null {
    return this.defaultConstraints.find((constraint) => {
      return constraint.schema === this.schema &&
        constraint.table === this.table &&
        constraint.column === column
    }) || null
  }

  dropIndexes(specs: DropIndexSpec[]) {
    if (!specs?.length) return null
    const names = specs.map((spec) => `${this.tableName}.${this.wrapIdentifier(spec.name)}`).join(", ")
    return `DROP INDEX ${names}`
  }


}
