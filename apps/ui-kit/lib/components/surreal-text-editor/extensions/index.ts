import { Extension } from "@codemirror/state"
import { surrealql } from "@surrealdb/codemirror"
import { sqlCompletionSource, sqlContextComplete } from "../../sql-text-editor/extensions/sqlContextComplete"
import { sql } from "../../sql-text-editor/extensions/customSql"

// import { QuerySelectionChangeParams } from "lib/components/sql-text-editor/v2/extensions"

// export type SurrealExtensionsConfig = {
//   onQuerySelectionChange: (params:QuerySelectionChangeParams) => void
// }

export function extensions(): Extension {
  return [
    sql(undefined, sqlCompletionSource),
    sqlContextComplete(),
    surrealql()
  ]
}
