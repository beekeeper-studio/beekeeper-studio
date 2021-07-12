import { AlterTableSpec, Dialect, SchemaItem } from "@shared/lib/dialects/models";
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

  constructor(table: string, schema: string = 'dbo', existingColumns: LiteSchemaItem[],  defaultConstraints: DefaultConstraint[] ) {
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

  alterType(column: string, newType: string) {
    return `ALTER COLUMN ${this.wrapIdentifier(column)} ${this.wrapLiteral(newType)}`
  }

  alterDefault(column: string, newDefalt: string | boolean | null) {
    // we drop the default in the initialSql

    const constraint: DefaultConstraint | null = this.getDefaultConstraint(column)

    const drop = constraint ? `DROP CONSTRAINT ${this.wrapIdentifier(constraint.name)}` : null


    if (newDefalt === null) return drop

    const add = `ADD DEFAULT ${this.wrapLiteral(newDefalt.toString())} FOR ${this.wrapIdentifier(column)}`

    return drop ? `${drop}, ${add}` : add
  }

  endSql(spec: AlterTableSpec) {
    const tablePrefix = spec.schema ? `${this.escapeString(spec.schema)}.` : ''
    const tableName = `${tablePrefix}${this.escapeString(spec.table)}`
    return (spec.alterations || []).filter((a) => a.changeType === 'columnName').map((a) => {
      return `EXEC sp_rename '${tableName}.${this.escapeString(a.columnName)}', '${this.escapeString(a.newValue.toString())}', 'COLUMN'`
    }).join(";")
  }

  alterNullable(column: string, nullable: boolean) {
    const existingType = this.existingColumns.find((c) => c.columnName === column)?.dataType
    if (!existingType) throw new Error("Can't change nullability without a type for column " + column)
    const direction = nullable ? 'NULL' : 'NOT NULL'
    return `ALTER COLUMN ${this.wrapIdentifier(column)} ${this.wrapLiteral(existingType)} ${direction}`
  }

  getDefaultConstraint(column: string): DefaultConstraint | null {
    return this.defaultConstraints.find((constraint) => {
      return constraint.schema === this.schema &&
        constraint.table === this.table &&
        constraint.column === column
    }) || null
  }


}