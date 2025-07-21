import { Extension } from "@codemirror/state"
import { surrealql } from "@surrealdb/codemirror"

// import { QuerySelectionChangeParams } from "lib/components/sql-text-editor/v2/extensions"

// export type SurrealExtensionsConfig = {
//   onQuerySelectionChange: (params:QuerySelectionChangeParams) => void
// }

export function extensions(): Extension {
  return [
    surrealql()
  ]
}
