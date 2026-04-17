import { Entity, TableEntity } from "../types";
import { Completion } from "@codemirror/autocomplete";
import getAliases from "./getAliases";
import type { SQLDialect, SQLNamespace } from "@codemirror/lang-sql";
import { nameCompletion } from "./extensions/vendor/@codemirror/lang-sql/src/complete";

export { getAliases };

/**
 * Convert column names to auto completion options
 */
export function columnsToCompletions(columns: string[], dialect?: SQLDialect): Completion[] {
  const idQuote = dialect?.spec.identifierQuotes?.[0] || '"'
  const caseInsensitiveIdentifiers = !!dialect?.spec.caseInsensitiveIdentifiers;
  return columns.map((column) => ({
    ...nameCompletion(column, "column", idQuote, caseInsensitiveIdentifiers),
    boost: 10 // Higher than keywords/tables
  }));
}

/**
 * Create tables object for SQL language configuration
 * Format is {"schema.table": [columns], "table": [columns]}
 */
export function buildSchema(
  entities: Entity[],
  defaultSchema?: string,
  dialect?: SQLDialect
): SQLNamespace {
  const tables: SQLNamespace = {};
  const idQuote = dialect?.spec.identifierQuotes?.[0] || '"'
  const caseInsensitiveIdentifiers = !!dialect?.spec.caseInsensitiveIdentifiers;

  entities.forEach((entity) => {
    // Only include table-like entities
    if (!isTableLikeEntity(entity)) return;

    // Skip names with dots to avoid conflicts with schema pattern
    if (/\./.test(entity.name)) return;

    const columns = entity.columns?.map((c) => c.field) || [];
    // Is it a table? a view? or none?
    const type = entity.entityType || "type";

    // Add unqualified name for default schema or no schema
    if (!entity.schema || (defaultSchema && entity.schema === defaultSchema)) {
      tables[entity.name] = {
        self: nameCompletion(entity.name, type, idQuote, caseInsensitiveIdentifiers),
        children: columns,
      };
    }

    // Add fully qualified name if it has a schema
    if (entity.schema) {
      tables[`${entity.schema}.${entity.name}`] = {
        self: nameCompletion(entity.name, type, idQuote, caseInsensitiveIdentifiers),
        children: columns,
      };
    }
  });

  return tables;
}

export function isTableLikeEntity(entity: Entity): entity is TableEntity {
  if (!entity.entityType) return true;
  return ["table", "view", "materialized-view"].includes(entity.entityType);
}
