import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { DuckDBData as D } from "@shared/lib/dialects/duckdb";
import { CreateIndexSpec, Dialect, SchemaItem } from "@shared/lib/dialects/models";

export class DuckDBChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'duckdb'
  wrapIdentifier = D.wrapIdentifier
  wrapLiteral = D.wrapLiteral
  escapeString = D.escapeString

  addColumn(item: SchemaItem) {
    if (!item.columnName || !item.dataType) {
      throw new Error("can't add a column without name or data type")
    }

    return [
      'ADD COLUMN',
      this.wrapIdentifier(item.columnName),
      this.wrapIdentifier(item.dataType),
      item.defaultValue ? `DEFAULT ${this.wrapLiteral(item.defaultValue)}` : null,
      item.nullable ? 'NULL' : 'NOT NULL',
      item.extra,
    ].filter((i) => !!i).join(" ")
  }

  singleIndex(spec: CreateIndexSpec): string {
    if (!spec.name) {
      throw new Error("Indexes require a name")
    }
    if (!spec.columns?.length) {
      throw new Error("Indexes require at least one column")
    }
    const unique = spec.unique ? 'UNIQUE' : ''
    const name = this.dialectData.wrapIdentifier(spec.name)
    const table = this.tableName
    const columns = spec.columns.map((c) => {
      const name = c.name.trim()
      if (name.startsWith('(') && name.endsWith(')')) {
        return c.name // This is an expression
      }
      return this.dialectData.wrapIdentifier(c.name)
    })
    return `CREATE ${unique} INDEX ${name} ON ${table} (${columns})`
  }
}
