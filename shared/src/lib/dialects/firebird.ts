import _ from "lodash";
import {
  ColumnType,
  defaultWrapLiteral,
  DialectData,
  friendlyNormalizedIdentifier,
} from "./models";
import Firebird from "node-firebird";

// prettier-ignore
const types = [
  "BIGINT", "BINARY", "BLOB", "BOOLEAN", "CHAR", "CHARACTER", "DATE", "DECFLOAT",
  "DECIMAL", "DOUBLE PRECISION", "FLOAT", "FLOAT", "INTEGER", "INT", "INT128",
  "NUMERIC", "REAL", "SMALLINT", "TIME", "TIMESTAMP", "VARBINARY", "BINARY VARYING",
  "VARCHAR", "CHAR VARYING", "CHARACTER VARYING",
];

// prettier-ignore
const charsets = [
  'NONE', 'CP943C', 'DOS737', 'DOS775', 'DOS858', 'DOS862', 'DOS864', 'DOS866',
  'DOS869', 'GB18030', 'GBK', 'ISO8859_1', 'ISO8859_2', 'ISO8859_3',
  'ISO8859_4', 'ISO8859_5', 'ISO8859_6', 'ISO8859_7', 'ISO8859_8', 'ISO8859_9',
  'ISO8859_13', 'KOI8R', 'KOI8U', 'TIS620', 'UTF8', 'WIN1251', 'WIN1252',
  'WIN1253', 'WIN1254', 'WIN1255', 'WIN1256', 'WIN1257', 'WIN1258', 'WIN_1258'
];

const supportsLength = [];

export const FirebirdData: DialectData = {
  charsets,
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t))),
  constraintActions: [],
  wrapIdentifier: (id: string) => id,
  editorFriendlyIdentifier: friendlyNormalizedIdentifier,
  escapeString: (s) => Firebird.escape(s),
  wrapLiteral: Firebird.escape,
  unwrapIdentifier: defaultWrapLiteral,
  disabledFeatures: {
    alter: {
      indexes: true,
    },
    cancelQuery: true,
    backup: true,
    truncateElement: true,
    duplicateTable: true,
    exportTable: true,
  },
  notices: {
  },
};
