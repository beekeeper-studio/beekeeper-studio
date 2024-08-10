import _ from "lodash";
import { ColumnType, defaultEscapeString, defaultWrapLiteral, DialectData, friendlyNormalizedIdentifier } from "./models";

const types = [
  'array', 'bignumeric', 'bool', 'bytes', 'date', 'datetime', 'float64', 'geography', 'int64', 'interval', 'json', 'numeric', 'string', 'struct', 'time', 'timestamp'
];

const supportsLength = [];

export const BigQueryData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t))),
  constraintActions: [],
  wrapIdentifier: (id: string) => id ? `\`${id.replaceAll(/`/g, '\\`')}\`` : null,
  editorFriendlyIdentifier: friendlyNormalizedIdentifier,
  escapeString: defaultEscapeString,
  wrapLiteral: defaultWrapLiteral,
  requireDataset: true,
  unwrapIdentifier: (s) => s,
  textEditorMode: "text/x-sql",
  disabledFeatures: {
    indexes: true,
    constraints: {
      onUpdate: true,
      onDelete: true
    },
    alter: {
      addConstraint: true,
      dropConstraint: true
    },
    importFromFile: true,
    createIndex: true,
    comments: true
  },
  notices: {
    infoIndexes: 'BigQuery: table indexes are not supported.',
    infoTriggers: 'BigQuery: table triggers are not supported.',
    tableTable: 'Editing records is currently disabled for BigQuery, we\'re working on it!'
  },
  usesOffsetPagination: false
}
