import { sqlContextComplete, sqlCompletionSource } from "./sqlContextComplete";
import { sql } from "./customSql";
import { removeQueryQuotesExtension } from "./removeQueryQuotes";
import { sqlHighlighter } from "./sqlHighlighter";

export { applyColumnsGetter } from "./sqlContextComplete";
export type { ColumnsGetter } from "./sqlContextComplete";
export { applySqlExtension, applyEntities } from "./customSql";
export { applyDialect } from "./removeQueryQuotes";

/**
 * Get all base SQL extensions
 */
export const extensions = [
  sql(undefined, sqlCompletionSource),
  sqlHighlighter,
  removeQueryQuotesExtension(),
  sqlContextComplete(),
];
