import { Entity, TableEntity } from "../types";
import { Completion } from "@codemirror/autocomplete";
import getAliases from "./getAliases";

export { getAliases };

/**
 * Check if a column name needs quoting
 * @param column - The column name to check
 * @returns True if the column name needs quoting, false otherwise
 */
function needsQuoting(column: string): boolean {
  const reservedWords = new Set([
    "user", "select", "order", "group", "table", "where", "from", "join"
  ]);
  
  const needsQuoting =
    (/^\d/.test(column) || // starts with number
     /[^a-z0-9_]/.test(column) || // contains special chars (case sensitive)
     /[A-Z]/.test(column) || // contains uppercase
     reservedWords.has(column.toLowerCase()) // is a reserved word
    ) && !/"/.test(column); // not already quoted

  return needsQuoting;
}

/**
 * Convert column names to auto completion options
 */
export function columnsToCompletions(columns: string[]): Completion[] {
  return columns.map((column) => {
    const quotedColumn = needsQuoting(column) ? `"${column}"` : column;
    
    return {
      label: column,
      type: "column", // This will become the class name
      apply: quotedColumn,
      boost: 10 // Higher than keywords/tables
    };
  });
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

export function isTableLikeEntity(entity: Entity): entity is TableEntity {
  if (!entity.entityType) return true;
  return ["table", "view", "materialized-view"].includes(entity.entityType);
}
