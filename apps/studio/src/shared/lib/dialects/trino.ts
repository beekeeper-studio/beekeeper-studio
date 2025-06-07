import _ from "lodash";
import { ColumnType, defaultEscapeString, defaultWrapLiteral, DialectData, friendlyNormalizedIdentifier } from "./models";

// TODO: find what these should be!
const types = [
  'array', 'bignumeric', 'bool', 'bytes', 'date', 'datetime', 'float64', 'geography', 'int64', 'interval', 'json', 'numeric', 'string', 'struct', 'time', 'timestamp'
];

const supportsLength = [];

export const TrinoData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t))),
  constraintActions: [],
  topDownGetEntities: true,
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
    infoIndexes: 'Trino: table indexes are not supported.',
    infoTriggers: 'Trino: table triggers are not supported.',
    tableTable: 'Editing records is currently disabled for Trino, It\'s not really recommend to do so anyway.'
  },
  usesOffsetPagination: false
}
