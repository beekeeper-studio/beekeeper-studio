import { SqlServerData } from "@shared/lib/dialects/sqlserver";
import _ from "lodash";
import { ChangeBuilderBase } from "./ChangeBuilderBase";






export class SqlServerChangeBuilder extends ChangeBuilderBase {

  wrapIdentifier = SqlServerData.wrapIdentifier
  wrapLiteral = SqlServerData.wrapLiteral
  escapeString = SqlServerData.escapeString

  renameColumn(column: string, newName: string): string {
    return `sp_rename ${this.escapeString(this.tableName)}.${this.escapeString(column)}, '${this.escapeString(newName)}', 'COLUMN';`
  }

  alterType(column: string, newType: string) {
    return `ALTER COLUMN ${this.wrapIdentifier(column)} ${this.wrapLiteral(newType)}`
  }
}