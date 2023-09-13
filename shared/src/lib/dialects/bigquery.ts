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
  friendlyNormalizedIdentifier: friendlyNormalizedIdentifier,
  escapeString: defaultEscapeString,
  wrapLiteral: defaultWrapLiteral,
  unwrapIdentifier: (s) => s,
  disabledFeatures: {
    // tableTable: true,
    constraints: {
      onUpdate: true,
      onDelete: true
    },
    // these disabled features are just until we have knex support.
    alter: {
      // everything: true
    },
  },
  notices: {
    infoSchema: 'Editing schemas is currently disabled for BigQuery, we\'re working on it!',
    infoIndexes: 'Editing indexes is currently disabled for BigQuery, we\'re working on it!',
    infoRelations: 'Editing relations is currently disabled for BigQuery, we\'re working on it!',
    infoTriggers: 'Editing triggers is currently disabled for BigQuery, we\'re working on it!',
    tableTable: 'Editing records is currently disabled for BigQuery, we\'re working on it!'
  }
}