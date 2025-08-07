import { sqlContextComplete } from "./sqlContextComplete";
import { sql, SQLConfig } from "./customSql";
import { removeQueryQuotesExtension } from "./removeQueryQuotes";
import { sqlHighlighter } from "./sqlHighlighter";
import { querySelection } from "./querySelection";
import type { QuerySelectionChangeParams } from "./querySelection";
import { Options } from "sql-query-identifier";

export { applyEntities, applyColumnsGetter, ColumnsGetter } from "./customSql";
export { applyDialect } from "./removeQueryQuotes";
export type { QuerySelectionChangeParams };

export type SQLExtensionsConfig = {
  identiferDialect?: Options["dialect"];
  onQuerySelectionChange?: (params: QuerySelectionChangeParams) => void
}

/**
 * Get all base SQL extensions
 */
export function extensions(config: SQLExtensionsConfig & SQLConfig) {
  return [
    sql(config),
    sqlHighlighter,
    removeQueryQuotesExtension(),
    sqlContextComplete(),
    querySelection(config.identiferDialect, config.onQuerySelectionChange),
  ];
}
