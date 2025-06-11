import {
  ColumnType,
  defaultConstraintActions,
  DialectData,
} from "./models";

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

const UNWRAPPER = /^`(.*)`$/;

export function surrealEscapeString(value: string, quote?: boolean): string {
  if (!value) return null;
  // SurrealDB uses single quotes for strings and escapes them by doubling
  const result = `${value.toString().replaceAll(/'/g, "''")}`;
  return quote ? `'${result}'` : result;
}

export function surrealWrapLiteral(str: string): string {
  // SurrealDB is more permissive with semicolons but we should still be careful
  return str ? str.replaceAll(/;/g, '') : '';
}

export function surrealEscapeValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'string') {
    return surrealEscapeString(value, true);
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  if (typeof value === 'object') {
    // For objects and arrays, SurrealDB expects JSON
    return JSON.stringify(value);
  }
  
  // Default to string escaping for unknown types
  return surrealEscapeString(String(value), true);
}

export const SurrealDBData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [...defaultConstraintActions],
  wrapIdentifier(value: string) {
    return (value !== '*' ? `\`${value.replaceAll(/`/g, '``')}\`` : '*');
  },
  usesOffsetPagination: false, // SurrealDB uses LIMIT and START
  editorFriendlyIdentifier: (s) => s,
  escapeString: surrealEscapeString,
  wrapLiteral: surrealWrapLiteral,
  requireDataset: false,
  disallowedSortColumns: ['object', 'array', 'bytes'],
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    return matched ? matched[1] : value;
  },
  textEditorMode: "text/x-sql", // SurrealQL is similar to SQL
  defaultColumnType: 'any',
  disabledFeatures: {
    shell: true, // No shell access
    alter: {
      everything: true, // SurrealDB schema changes are different
    },
    triggers: true, // SurrealDB uses events, not traditional triggers
    relations: true, // SurrealDB has records but not traditional foreign keys
    constraints: {
      onUpdate: true,
      onDelete: true
    },
    backup: true, // Different backup mechanism
    collations: true, // SurrealDB doesn't use collations
    schema: true, // SurrealDB is schemaless
    multipleDatabases: false, // SurrealDB supports multiple databases
    transactions: true, // SurrealDB has different transaction model
    createTable: true, // Tables are created implicitly in SurrealDB
    dropTable: true, // Different table management
    compositeKeys: true, // SurrealDB uses record IDs
    sqlCreate: true, // No traditional CREATE TABLE statements
  },
  notices: {
    query: 'SurrealDB uses SurrealQL syntax, which differs from standard SQL. Refer to SurrealDB documentation for query syntax.',
  },
  boolean: {
    true: true,
    false: false
  }
};