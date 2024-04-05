import _ from 'lodash'
import { Dialect, SchemaItem, SchemaItemChange } from "@shared/lib/dialects/models";
import { ChangeBuilderBase } from "./ChangeBuilderBase";

const alterSortRank = {
  dataType: 0,
  defaultValue: 1,
  nullable: 2
}

export class OracleChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'oracle'
  get multiStatementMode(): boolean {
    return true;
  }

  wrapIdentifier(str: string): string {
    return this.dialectData.wrapIdentifier(str)
  }
  wrapLiteral(str: string): string {
    return this.dialectData.wrapLiteral(str)
  }
  escapeString(str: string, quote?: boolean): string {
    return this.dialectData.escapeString(str, quote)
  }

  addColumn(item: SchemaItem) {
    const result = super.addColumn(item)
    return result.replace(/^ADD COLUMN/, '')
  }

  addColumns(items: SchemaItem[]): string[] {
    if (!items?.length) return []
    return [`ADD (${items.map((i) => this.addColumn(i)).join(", ")})`]
  }

  alterNullable(_column: string, nullable: boolean) {
    const target = nullable ? 'NULL' : 'NOT NULL'
    return `${target}`
  }

  alterDefault(_column: string, newDefault: string | boolean | null) {
    const value = newDefault ? this.wrapLiteral(newDefault.toString()) : 'NULL'
    return `DEFAULT ${value}`
  }

  alterType(_column: string, newType: string) {
    return `${this.wrapLiteral(newType)}`
  }

  alterColumn(column: string, changes: SchemaItemChange[]) {
    const sortedChanges = _.sortBy(changes, (c) => alterSortRank[c.changeType])
    const changeSqls = super.alterColumns(sortedChanges)
    return `${this.wrapIdentifier(column)} ${changeSqls.join(' ')}`
  }

  alterColumns(items: SchemaItemChange[]): string[] {
    const collected = _.groupBy(items, 'columnName')
    const changesByColumn = Object.keys(collected).map((k) => {
      const changes = collected[k]
      return this.alterColumn(k, changes)
    })
    return changesByColumn.length ? [`MODIFY (${changesByColumn.join(",")})`] : []
  }

  dropColumns(items: string[]): string[] {
    if (!items?.length) return []
    const escaped = items.map((i) => this.wrapIdentifier(i)).join(", ")
    return [`DROP (${escaped})`]
  }

}
