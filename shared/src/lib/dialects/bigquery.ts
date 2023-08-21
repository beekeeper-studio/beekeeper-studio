import _ from "lodash";
import { ColumnType, defaultEscapeString, defaultWrapLiteral, DialectData, friendlyNormalizedIdentifier } from "./models";

const types = [
  'array', 'bignumeric', 'bool', 'bytes', 'date', 'datetime', 'float64', 'geography', 'int64', 'interval', 'json', 'numeric', 'string', 'struct', 'time', 'timestamp'
];

const supportsLength = [];

export const BigQueryData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t))),
  constraintActions: [],
  wrapIdentifier: (_id: string) => ``,
  friendlyNormalizedIdentifier: friendlyNormalizedIdentifier,
  escapeString: defaultEscapeString,
  wrapLiteral: defaultWrapLiteral,
  unwrapIdentifier: (s) => s,
  disabledFeatures: {
    constraints: {
      onUpdate: true,
      onDelete: true
    }
  }
}