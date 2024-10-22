import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { FirebirdData } from "@shared/lib/dialects/firebird";
import { CreateIndexSpec, Dialect, SchemaItem } from "@shared/lib/dialects/models";
import { TableColumn } from "@/lib/db/models";

export class FirebirdChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'firebird'
  wrapIdentifier = FirebirdData.wrapIdentifier
  wrapLiteral = FirebirdData.wrapLiteral
  escapeString = FirebirdData.escapeString

  renameColumn(column: string, newName: string) {
    return `ALTER COLUMN ${column} TO ${newName}`
  }

  singleIndex(spec: CreateIndexSpec): string {
    if (!spec.columns?.length) {
      throw new Error("Indexes require at least one column")
    }

    if (!spec.name) {
      throw new Error("Indexes require a name")
    }

    const unique = spec.unique ? 'UNIQUE' : ''
    const columns = spec.columns.map((c) => c.name)

    // FIXME: can't add order yet cause it's blocked by sql-query-identifier.
    //
    const order = spec.order || 'ASC'
    return `CREATE ${unique} ${order} INDEX ${spec.name} ON ${this.tableName} (${columns})`
    // return `CREATE ${unique} INDEX ${spec.name} ON ${this.tableName} (${columns})`
  }

  alterType(column: string, newType: string) {
    return `ALTER COLUMN ${column} TYPE ${newType}`
  }

  alterDefault(column: string, newDefault: string | boolean | null) {
    if (newDefault === null) {
      return `ALTER COLUMN ${this.wrapIdentifier(column)} DROP DEFAULT`
    } else {
      return `ALTER COLUMN ${this.wrapIdentifier(column)} SET DEFAULT ${newDefault.toString()}`
    }
  }

  addColumn(item: SchemaItem) {
    if (!item.columnName || !item.dataType) {
      throw new Error("can't add a column without name or data type")
    }

    return [
      'ADD',
      this.wrapIdentifier(item.columnName),
      item.dataType,
      item.defaultValue ? `DEFAULT ${this.wrapLiteral(item.defaultValue)}` : null,
      item.nullable ? '' : 'NOT NULL',
      item.extra,
      item.comment ? `COMMENT ${this.escapeString(item.comment, true)}` : null
    ].filter((i) => !!i).join(" ")
  }

  dropColumn(column: string) {
    return `DROP ${this.wrapIdentifier(column)}`
  }

  reorderColumns(oldColumnOrder: TableColumn[], newColumnOrder: TableColumn[]): string {
    const newOrder = newColumnOrder.reduce((acc, NCO, index) => {
      if ( oldColumnOrder.length < index + 1) return acc
      const { columnName } = NCO
      const { columnName: oldColumnName } = oldColumnOrder[index]
      if ( columnName !== oldColumnName) {
          acc.push(`ALTER TABLE ${this.wrapIdentifier(this.table)} ALTER ${this.wrapIdentifier(columnName)} POSITION ${index + 1}`)
      }
      
      return acc
    }, [])

    return (newOrder.length) ? newOrder.join(';') : ''
  }
}
