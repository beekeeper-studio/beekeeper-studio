import _ from "lodash";
import { ColumnType, defaultEscapeString, DialectData, friendlyNormalizedIdentifier } from "./models";

// TODO: find what these should be!
const types = [
  'array', 'bignumeric', 'bool', 'bytes', 'date', 'datetime', 'float64', 'geography', 'int64', 'interval', 'json', 'numeric', 'string', 'struct', 'time', 'timestamp'
];

const supportsLength = [];

export const TrinoData: DialectData = {
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
    filterWithOR: true,
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
      sql: true
    },
    schema: true,
    multipleDatabases: true,
    generatedColumns: true,
    transactions: true,
    chunkSizeStream: true,
    binaryColumn: true,
    initialSort: true,
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
  usesOffsetPagination: false
}
