import { Dialect } from "@shared/lib/dialects/models";
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

  renameColumn(column: string, newName: string): string {
    return `sp_rename ${this.escapeString(this.tableName)}.${this.escapeString(column)}, '${this.escapeString(newName)}', 'COLUMN';`
  }

  alterType(column: string, newType: string) {
    return `ALTER COLUMN ${this.wrapIdentifier(column)} ${this.wrapLiteral(newType)}`
  }

  alterDefault(column: string, newDefalt: string) {
    // we drop the default in the initialSql

    const constraint: DefaultConstraint | null = this.getDefaultConstraint(column)

    const drop = constraint ? `DROP CONSTRAINT ${this.wrapIdentifier(constraint.name)}` : null

    if (newDefalt === null && drop) return drop

    const add = `ADD DEFAULT ${this.wrapLiteral(newDefalt)} FOR ${this.wrapIdentifier(column)}`

    return drop ? `${drop}, ${add}` : add
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