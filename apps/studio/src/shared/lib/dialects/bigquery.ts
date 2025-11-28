import _ from "lodash";
import { ColumnType, defaultEscapeString, defaultWrapLiteral, DialectData, friendlyNormalizedIdentifier } from "./models";

const types = [
  'array', 'bignumeric', 'bool', 'bytes', 'date', 'datetime', 'float64', 'geography', 'int64', 'interval', 'json', 'numeric', 'string', 'struct', 'time', 'timestamp'
];

const supportsLength = [];

export const BigQueryData: DialectData = {
  sqlLabel: "SQL",
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t))),
  constraintActions: [],
  importDataType: {
    stringType: 'string',
    dateType: 'date',
    booleanType: 'bool',
    integerType: 'int64',
    numberType: 'float64',
    defaultType: 'string'
  },
  wrapIdentifier: (id: string) => {
    if (id) {
      // Escape backticks and backslashes
      // should escape \ and `
      // eg: foo`bar => foo\`bar
      // eg: foo\bar => foo\\bar
      return `\`${id.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``;
    }
    return null;
  },
  editorFriendlyIdentifier: friendlyNormalizedIdentifier,
  escapeString: defaultEscapeString,
  wrapLiteral: defaultWrapLiteral,
  requireDataset: true,
  unwrapIdentifier: (s) => s,
  textEditorMode: "text/x-sql",
  disabledFeatures: {
    manualCommit: true,
    shell: true,
    truncateElement: true,
    duplicateTable: true,
    sqlCreate: true,
    dropTable: true,
    indexes: true,
    compositeKeys: true,
    constraints: {
      onUpdate: true,
      onDelete: true
    },
    alter: {
      addConstraint: true,
      dropConstraint: true,
      reorderColumn: true,
    },
    importFromFile: true,
    createIndex: true,
    comments: true,
    initialSort: true,
  },
  notices: {
    infoIndexes: 'BigQuery: table indexes are not supported.',
    infoTriggers: 'BigQuery: table triggers are not supported.',
    tableTable: 'Editing records is currently disabled for BigQuery, we\'re working on it!'
  },
  usesOffsetPagination: false
}
