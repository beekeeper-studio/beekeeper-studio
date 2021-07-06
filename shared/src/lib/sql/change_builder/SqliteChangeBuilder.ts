import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { SqliteData as D } from "@shared/lib/dialects/sqlite";
import { Dialect } from "@shared/lib/dialects/models";


export class SqliteChangeBuilder extends ChangeBuilderBase {
  constructor(table: string) {
    super(table)
  }
  dialect: Dialect = 'sqlite'
  wrapIdentifier = D.wrapIdentifier
  wrapLiteral = D.wrapLiteral
  escapeString = D.escapeString
  
}