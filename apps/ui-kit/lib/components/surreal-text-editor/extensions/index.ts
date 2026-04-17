import { Extension } from "@codemirror/state"
import { surrealql } from "@surrealdb/codemirror"
import { sqlCompletionSource, sqlContextComplete } from "../../sql-text-editor/extensions/sqlContextComplete"
import { sql, SQLConfig } from "../../sql-text-editor/extensions/customSql"

// import { QuerySelectionChangeParams } from "lib/components/sql-text-editor/v2/extensions"

// export type SurrealExtensionsConfig = {
//   onQuerySelectionChange: (params:QuerySelectionChangeParams) => void
// }

export function extensions(config: SQLConfig): Extension {
  return [
    sql(config),
    sqlContextComplete(),
    config.columnsGetter ? sqlCompletionSource(config.columnsGetter) : [],
    surrealql()
  ]
}
