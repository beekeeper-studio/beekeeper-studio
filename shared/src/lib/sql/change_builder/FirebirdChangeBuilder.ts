import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { FirebirdData } from "@shared/lib/dialects/firebird";
import { CreateIndexSpec, Dialect } from "@shared/lib/dialects/models";

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
    // const order = spec.order || 'ASC'
    // return `CREATE ${unique} ${order} INDEX ${spec.name} ON ${this.tableName} (${columns})`

    return `CREATE ${unique} INDEX ${spec.name} ON ${this.tableName} (${columns})`
  }

  alterType(column: string, newType: string) {
    return `ALTER COLUMN ${this.wrapIdentifier(column)} TYPE ${newType}`
  }
}
