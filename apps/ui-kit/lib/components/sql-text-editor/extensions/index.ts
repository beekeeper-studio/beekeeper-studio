import { sqlContextComplete, sqlCompletionSource } from "./sqlContextComplete";
import { sql } from "./customSql";
import { removeQueryQuotesExtension } from "./removeQueryQuotes";
import { sqlHighlighter } from "./sqlHighlighter";
import { querySelection } from "./querySelection";
import type { QuerySelectionChangeParams } from "./querySelection";
import { Options } from "sql-query-identifier";

export { applyColumnsGetter } from "./sqlContextComplete";
export type { ColumnsGetter } from "./sqlContextComplete";
export { applySqlExtension, applyEntities } from "./customSql";
export { applyDialect } from "./removeQueryQuotes";
export type { QuerySelectionChangeParams };

export type SQLExtensionsConfig = {
  identiferDialect?: Options["dialect"];
  onQuerySelectionChange?: (params: QuerySelectionChangeParams) => void
}

/**
 * Get all base SQL extensions
 */
export function extensions(config: SQLExtensionsConfig) {
  return [
    sql(undefined, sqlCompletionSource),
    sqlHighlighter,
    removeQueryQuotesExtension(),
    sqlContextComplete(),
    querySelection(config.identiferDialect, config.onQuerySelectionChange),
  ];
}
