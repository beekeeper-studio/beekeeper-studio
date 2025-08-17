import { sqlCompletionSource, sqlContextComplete } from "./sqlContextComplete";
import { sql, SQLConfig } from "./customSql";
import { removeQueryQuotesExtension } from "./removeQueryQuotes";
import { sqlHighlighter } from "./sqlHighlighter";
import { querySelection } from "./querySelection";
import type { QuerySelectionChangeParams } from "./querySelection";
import { Options } from "sql-query-identifier";

export { applyEntities } from "./customSql";
export { applyDialect } from "./removeQueryQuotes";
export { type ColumnsGetter } from "./sqlContextComplete";
export type { QuerySelectionChangeParams };

export type SQLExtensionsConfig = SQLConfig & {
  identiferDialect?: Options["dialect"];
  onQuerySelectionChange?: (params: QuerySelectionChangeParams) => void
}

/**
 * Get all base SQL extensions
 */
export function extensions(config: SQLExtensionsConfig) {
  return [
    sql(config),
    sqlHighlighter,
    removeQueryQuotesExtension(),
    sqlContextComplete(),
    config.columnsGetter ? sqlCompletionSource(config.columnsGetter) : [],
    querySelection(config.identiferDialect, config.onQuerySelectionChange),
  ];
}
