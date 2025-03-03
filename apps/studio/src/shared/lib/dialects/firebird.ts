import _ from "lodash";
import {
  ColumnType,
  defaultWrapLiteral,
  DialectData,
  friendlyNormalizedIdentifier,
} from "./models";

// prettier-ignore
const types = [
  "BIGINT", "BINARY", "BLOB", "BOOLEAN", "CHAR", "CHARACTER", "DATE", "DECFLOAT",
  "DECIMAL", "DOUBLE PRECISION", "FLOAT", "FLOAT", "INTEGER", "INT", "INT128",
  "NUMERIC", "REAL", "SMALLINT", "TIME", "TIMESTAMP", "VARBINARY", "BINARY VARYING",
  "VARCHAR", "CHAR VARYING", "CHARACTER VARYING",
];

const supportsLength = [];

function wrapIdentifier(id: string) {
  if (id.includes(" ")) return `"${id}"`;
  return id;
}
function escape(value) {
  if (value === null || value === undefined)
      return 'NULL';

  switch (typeof(value)) {
      case 'boolean':
            return value ? 'true' : 'false';
      case 'number':
          return value.toString();
      case 'string':
          return "'" + value.replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
  }

  if (value instanceof Date)
      return "'" + value.getFullYear() + '-' + (value.getMonth()+1).toString().padStart(2, '0') + '-' + value.getDate().toString().padStart(2, '0') + ' ' + value.getHours().toString().padStart(2, '0') + ':' + value.getMinutes().toString().padStart(2, '0') + ':' + value.getSeconds().toString().padStart(2, '0') + '.' + value.getMilliseconds().toString().padStart(3, '0') + "'";

  throw new Error('Escape supports only primitive values.');
};
export const FirebirdData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t))),
  constraintActions: [],
  wrapIdentifier,
  // NOTE I HAVE NO IDEA IF THIS IS RIGHT
  usesOffsetPagination: false,
  editorFriendlyIdentifier: friendlyNormalizedIdentifier,
  escapeString: (s) => escape(s),
  wrapLiteral: escape,
  unwrapIdentifier: defaultWrapLiteral,
  requireDataset: false,
  textEditorMode: "text/x-sql",
  disabledFeatures: {
    backup: true,
    truncateElement: true,
    duplicateTable: true,
    createTable: true, // Blocked by knex builder creating unnecessary query
    collations: true,
    alter: {
      multiStatement: true,
      renameSchema: true,
      renameTable: true,
      renameView: true,
    },
    multipleDatabases: true,
    schema: true,
    generatedColumns: true,
    multipleDatabase: true,
  },
  notices: {},
};
