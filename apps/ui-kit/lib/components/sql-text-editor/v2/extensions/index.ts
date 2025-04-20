import { extendedSql } from "./extendedSql";
import { removeQueryQuotesExtension } from "./removeQueryQuotes";
import { triggerAutocompleteExtension } from "./triggerAutocomplete";

export { applySqlExtension, applyEntities, applyColumnsGetter } from "./extendedSql";
export { applyDialect } from "./removeQueryQuotes";

/**
 * Get all base SQL extensions
 */
export const extensions = [
  extendedSql(),
  removeQueryQuotesExtension(),
  triggerAutocompleteExtension(),
];
