import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { SqliteData as D } from "@shared/lib/dialects/sqlite";
import { Dialect, DropIndexSpec } from "@shared/lib/dialects/models";


export class SqliteChangeBuilder extends ChangeBuilderBase {
  constructor(table: string) {
    super(table)
  }
  dialect: Dialect = 'sqlite'
  wrapIdentifier = D.wrapIdentifier
  wrapLiteral = D.wrapLiteral
  escapeString = D.escapeString

  dropIndexes(drops: DropIndexSpec[]): string | null {
    if (!drops?.length) return null
    return drops.map((drop) => {
      return `DROP INDEX ${this.wrapIdentifier(drop.name)}`
    }).join(";")
  }
  
}