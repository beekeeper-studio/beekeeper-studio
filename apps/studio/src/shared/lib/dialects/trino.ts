import {
  ColumnType,
  defaultConstraintActions,
  defaultEscapeString,
  defaultWrapLiteral,
  defaultWrapIdentifier,
  friendlyNormalizedIdentifier,
  DialectData,
  SpecialTypes,
} from "./models";

// Trino supports a wide range of types, including PostgreSQL compatible ones
// Reference: https://trino.io/docs/current/language/types.html
const types = [
  ...SpecialTypes,
  'boolean', 'tinyint', 'smallint', 'integer', 'bigint', 'real', 'double', 'decimal',
  'varchar', 'char', 'varbinary', 'json', 'date', 'time', 'time with time zone',
  'timestamp', 'timestamp with time zone', 'interval year to month', 'interval day to second',
  'array', 'map', 'row', 'ipaddress', 'uuid', 'hyperloglog', 'p4hyperloglog', 'qdigest',
  'tdigest'
];

const supportsLength = [
  'varchar', 'char'
];

const defaultLength = (t: string) => {
  if (t.startsWith('var')) return 255;
  return 8;
};

const UNWRAPPER = /^"(.*)"$/;

export const TrinoData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: defaultConstraintActions,
  wrapIdentifier: defaultWrapIdentifier,
  editorFriendlyIdentifier: (s) => friendlyNormalizedIdentifier(s, '"'),
  escapeString: defaultEscapeString,
  wrapLiteral: defaultWrapLiteral,
  usesOffsetPagination: true,
  defaultSchema: 'tpch', // Default schema name based on client implementation
  requireDataset: false,
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    return matched ? matched[1] : value;
  },
  textEditorMode: "text/x-pgsql", // Using PostgreSQL mode for syntax highlighting
  disabledFeatures: {
    shell: true,
    informationSchema: {
      extra: true
    },
    alter: {
      addColumn: true,
      dropColumn: true,
      renameColumn: true,
      alterColumn: true,
      multiStatement: true,
      addConstraint: true,
      dropConstraint: true,
      reorderColumn: true,
      renameSchema: true,
      renameTable: true,
      renameView: true
    },
    triggers: true,
    relations: true,
    constraints: {
      onUpdate: true,
      onDelete: true
    },
    defaultValue: true,
    collations: true,
    createIndex: true,
    indexes: true,
    createTable: true,
    dropTable: true,
    duplicateTable: true,
    comments: true,
    backup: true,
    truncateElement: true,
    transactions: true
  },
  notices: {
    infoSchema: "Some information schema details may be limited in Trino.",
    query: "Trino is primarily designed for analytical queries across large datasets.",
    tableTable: "Table operations are limited in Trino as it's primarily a query engine."
  },
  defaultColumnType: "varchar",
  charsets: ["UTF8"]
}