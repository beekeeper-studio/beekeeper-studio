import { ColumnType, defaultConstraintActions, DialectData } from "./models";

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

export function surrealEscapeString(value: string, quote?: boolean): string {
  if (!value) return null;

  const result = `${value.toString().replaceAll(/'/g, "''")}`;
  return quote ? `'${result}'` : result;
}

export function surrealWrapLiteral(str: string): string {
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
    return JSON.stringify(value);
  }

  return surrealEscapeString(String(value), true);
}

export const SurrealDBData: DialectData = {
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
    shell: true,
    alter: {
      everything: true
    },
    triggers: true, // Surreal uses events, not triggers,
    backup: true,
    collations: true,
    schema: true,
    multipleDatabases: false,
    transactions: true, // look into this
    createTable: true,
    dropTable: true,
    compositeKeys: true,
    sqlCreate: true, // there aren't traditional create table statements, but we may still be able to provide a define schema statement for this.
  },
  boolean: {
    true: true,
    false: false,
  }
}
