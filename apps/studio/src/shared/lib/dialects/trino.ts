import _ from "lodash";
import { ColumnType, defaultEscapeString, DialectData, friendlyNormalizedIdentifier } from "./models";

// https://trino.io/docs/current/language/types.html
const types = [
  'BOOLEAN', 'TINYINT', 'SMALLINT', 'INTEGER or INT', 'BIGINT', 'REAL', 'DOUBLE', 'DECIMAL', 'VARCHAR', 'CHAR', 'VARBINARY', 'JSON', 'DATE', 'TIME', 'TIME(P)', 'TIME WITH TIME ZONE',
  'TIMESTAMP', 'TIMESTAMP(P)', 'TIMESTAMP WITH TIME ZONE', 'TIMESTAMP(P) WITH TIME ZONE', 'INTERVAL YEAR TO MONTH', 'INTERVAL DAY TO SECOND',
  'ARRAY', 'MAP', 'ROW', 'IPADDRESS', 'UUID', 'HyperLogLog', 'P4HyperLogLog', 'SetDigest', 'QDigest', 'TDigest',
];

const supportsLength = [];

export const TrinoData: DialectData = {
  sqlLabel: "SQL",
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t))),
  constraintActions: [],
  wrapIdentifier: (id: string) => id ? `"${id.replaceAll(/"/g, '""')}"` : null,
  editorFriendlyIdentifier: friendlyNormalizedIdentifier,
  escapeString: defaultEscapeString,
  wrapLiteral: (str: string): string => {
    if (str == null) return 'NULL'; // for null values

    const escaped = str.replace(/'/g, "''");
    return `'${escaped}'`;
  },
  requireDataset: true,
  unwrapIdentifier: (s) => s,
  textEditorMode: "text/x-sql",
  disabledFeatures: {
    manualCommit: true,
    rawFilters: true,
    shell: true,
    informationSchema: {
      extra: true
    },
    indexes: true,
    alter: {
      addColumn: true,
      dropColumn: true,
      renameColumn: true,
      alterColumn: true,
      multiStatement: true,
      addConstraint: true,
      dropConstraint: true,
      everything: true,
      indexes: true,
      renameSchema: true,
      renameTable: true,
      renameView: true,
      reorderColumn: true
    },
    triggers: true,
    relations: true,
    constraints: {
      onUpdate: true,
      onDelete: true
    },
    index: {
      id: true,
      desc: true,
      primary: true
    },
    primary: true, // for mongo
    defaultValue: true,
    nullable: true,
    createIndex: true,
    comments: true,
    backup: true,
    truncateElement: true,
    exportTable: true,
    createTable: true,
    dropTable: true,
    dropSchema: true,
    collations: true,
    importFromFile: true,
    headerSort: true,
    duplicateTable: true,
    export: {
      sql: true,
      stream: true
    },
    schema: true,
    generatedColumns: true,
    transactions: true,
    chunkSizeStream: true,
    binaryColumn: true,
    sqlCreate: true,
    compositeKeys: true,    // Whether composite keys are supported
    schemaValidation: true  // Whether schema validation features are disabled
  },
  notices: {
    infoIndexes: 'Trino: table indexes are not supported.',
    infoTriggers: 'Trino: table triggers are not supported.',
    tableTable: 'Editing records is currently disabled for Trino, It\'s not really recommend to do so anyway.',
    infoRelations: 'Please reference your core database for relation information'
  },
  usesOffsetPagination: true
}
