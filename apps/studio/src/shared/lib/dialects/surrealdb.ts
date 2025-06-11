import {
  ColumnType,
  defaultConstraintActions,
  defaultEscapeString,
  DialectData,
  SpecialTypes,
} from "./models";

const types = [
  ...SpecialTypes,
  'any', 'bool', 'datetime', 'decimal', 'duration', 'float', 'int', 'number', 'string', 'uuid', 'record', 'geometry', 'object', 'array', 'set',
]

const supportsLength = [
  'string',
]

const defaultLength = () => 255

export const SurrealDBData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength())),
  constraintActions: [...defaultConstraintActions],
  wrapIdentifier(value: string): string {
    if (value === '*') return value;
    // SurrealDB uses backticks for identifiers
    return `\`${value.replace(/`/g, '``')}\``;
  },
  editorFriendlyIdentifier: (s) => s,
  escapeString(value: string, quote?: boolean): string {
    if (!value) return null;
    // SurrealDB uses single quotes for strings and doubles internal quotes
    const result = value.toString().replaceAll(/'/g, "''");
    return quote ? `'${result}'` : result;
  },
  wrapLiteral(value: string): string {
    return value ? value.replaceAll(/;/g, '') : '';
  },
  usesOffsetPagination: false, // SurrealDB uses START clause
  requireDataset: false,
  textEditorMode: "text/x-surrealql", // Custom mode for SurrealQL
  disabledFeatures: {
    shell: true,
    informationSchema: {
      extra: true
    },
    alter: {
      everything: true // SurrealDB has different alter syntax
    },
    triggers: true,
    relations: true, // SurrealDB uses different relationship model
    backup: true,
    exportTable: true,
    createTable: true, // Different CREATE syntax
    dropTable: true,
    dropSchema: true,
    collations: true,
    importFromFile: true,
    schema: true,
    duplicateTable: true,
    export: {
      sql: true
    },
    multipleDatabases: true, // SurrealDB uses namespaces/databases differently
    transactions: true, // Different transaction model
    schemaValidation: true,
  },
  notices: {
    query: 'SurrealDB uses SurrealQL syntax, which differs from standard SQL.'
  }
}