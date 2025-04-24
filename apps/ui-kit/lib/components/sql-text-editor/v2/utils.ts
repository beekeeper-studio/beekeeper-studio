import { Entity } from "../../types";
import { Completion } from "@codemirror/autocomplete";
import getAliases from "./getAliases";

export { getAliases };

/**
 * Convert column names to auto completion options
 */
export function columnsToCompletions(columns: string[]): Completion[] {
  return columns.map((column) => ({ 
    label: column,
    type: "column", // This will become the class name
    apply: column
  }));
}

/**
 * Create tables object for SQL language configuration
 * Format is {"schema.table": [columns], "table": [columns]}
 */
export function buildSchema(
  entities: Entity[],
  defaultSchema?: string
): Record<string, string[]> {
  const tables: Record<string, string[]> = {};

  entities.forEach((entity) => {
    // Only include table-like entities
    if (!isTableLikeEntity(entity)) return;

    // Skip names with dots to avoid conflicts with schema pattern
    if (/\./.test(entity.name)) return;

    const columns = entity.columns?.map((c) => c.field) || [];

    // Add unqualified name for default schema or no schema
    if (!entity.schema || (defaultSchema && entity.schema === defaultSchema)) {
      tables[entity.name] = columns;
    }

    // Add fully qualified name if it has a schema
    if (entity.schema) {
      tables[`${entity.schema}.${entity.name}`] = columns;
    }
  });

  return tables;
}

export function isTableLikeEntity(entity: Entity): boolean {
  if (!entity.entityType) return true;
  return ["table", "view", "materialized-view"].includes(entity.entityType);
}
