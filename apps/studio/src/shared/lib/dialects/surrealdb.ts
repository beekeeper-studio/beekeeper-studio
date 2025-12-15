import { ColumnType, defaultConstraintActions, DialectData } from "./models";
import _ from 'lodash';

const types = [
  'string', 'text', 'number', 'int', 'float', 'decimal', 'bool', 'boolean',
  'datetime', 'date', 'time', 'duration', 'uuid', 'object', 'array',
  'bytes', 'any', 'null', 'record', 'geometry', 'option'
];

const supportsLength = [
  'string', 'text', 'number', 'decimal'
];

const defaultLength = (t: string) => {
  if (t === 'string' || t === 'text') return 255;
  if (t === 'number' || t === 'decimal') return 10;
  return 0;
};

// TODO (@day): not sure this properly covers all cases
const UNWRAPPER = /^`(.*)`$/;

export const RECORD_ID_REGEX = /^(?:[a-zA-Z_][a-zA-Z0-9_\-]*|⟨[^⟩]+⟩):.+$/;

export function surrealEscapeString(value: string, quote?: boolean): string {
  if (!value) return 'NULL';

  const result = value.replace(/'/g, "''");
  return quote ? `'${result}'` : result;
}

export function surrealWrapLiteral(str: string): string {
  return str ? str.replace(/;/g, '') : '';
}

// Utility to coerce string values to native types
function coerceValue(value: string): any {
  // Handle null/undefined
  if (value == null) return null;

  // Unquoted record IDs (leave untouched)
  if (RECORD_ID_REGEX.test(value)) return value;

  // Try to parse JSON object/array
  if ((value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))) {
    try {
      return JSON.parse(value);
    } catch {
      // Fall through
    }
  }

  // Try to parse boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Try to parse number
  if (!isNaN(value as any)) return Number(value);

  // Default: treat as string
  return value;
}

export function surrealEscapeValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';

  // If it's a string, try coercing to appropriate type
  if (typeof value === 'string') {
    const coerced = coerceValue(value);

    // Re-run with coerced value (if it changed type)
    if (typeof coerced !== 'string') {
      return surrealEscapeValue(coerced);
    }

    // If it's a record ID, leave unquoted
    if (RECORD_ID_REGEX.test(value)) return value;

    // Otherwise, escape as a string
    return surrealEscapeString(value, true);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'object') {
    return surrealEscapeString(JSON.stringify(value), true);
  }

  // Fallback for any other type
  return surrealEscapeString(String(value), true);
}

export const SurrealDBData: DialectData = {
  sqlLabel: "SQL",
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [...defaultConstraintActions],
  usesOffsetPagination: false, // not sure about this
  editorFriendlyIdentifier: (s) => s,
  escapeString: surrealEscapeString,
  wrapLiteral: surrealWrapLiteral,
  requireDataset: false,
  disallowedSortColumns: ['object', 'array', 'bytes'],
  textEditorMode: "text/x-sql", // look into how we do this with the cm6 plugin
  defaultColumnType: 'any',
  disabledFeatures: {
    manualCommit: true,
    shell: true,
    alter: {
      everything: true
    },
    triggers: true, // Surreal uses events, not triggers,
    backup: true,
    collations: true,
    schema: true,
    transactions: true, // look into this
    createTable: true,
    dropTable: true,
    compositeKeys: true,
    importFromFile: true,
  },
  boolean: {
    true: true,
    false: false,
  }
}
