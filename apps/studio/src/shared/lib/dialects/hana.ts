import _ from "lodash";
import {
  ColumnType,
  defaultConstraintActions,
  defaultEscapeString,
  defaultWrapIdentifier,
  defaultWrapLiteral,
  DialectData,
  SpecialTypes,
} from "./models";

const UNWRAPPER = /^"(.*)"$/;

// SAP HANA data types
// https://help.sap.com/docs/SAP_HANA_PLATFORM/4fe29514fd584807ac9f2a04f6754767/20a1569875191014b507cf392724b7eb.html
const types = [
  ...SpecialTypes,
  'alphanum', 'bigint', 'blob', 'boolean', 'clob', 'date', 'decimal',
  'double', 'integer', 'nclob', 'nvarchar', 'real', 'seconddate',
  'shorttext', 'smalldecimal', 'smallint', 'st_geometry', 'st_point',
  'text', 'time', 'timestamp', 'tinyint', 'varbinary', 'varchar'
];

const supportsLength = [
  'alphanum', 'nvarchar', 'shorttext', 'varbinary', 'varchar'
];

const supportsPrecisionScale = [
  'decimal'
];

const defaultLength = (t: string) => t.includes('var') ? 255 : 127;

export const HanaData: DialectData = {
  sqlLabel: "SQL",
  columnTypes: types.map((t) => {
    const supportsLen = supportsLength.includes(t);
    const supportsPrecScale = supportsPrecisionScale.includes(t);
    return new ColumnType(t, supportsLen || supportsPrecScale, defaultLength(t));
  }),
  constraintActions: [...defaultConstraintActions, 'RESTRICT'],
  wrapIdentifier: defaultWrapIdentifier,
  editorFriendlyIdentifier: (s) => s,
  wrapLiteral: defaultWrapLiteral,
  requireDataset: false,
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    return matched ? matched[1] : value;
  },
  escapeString: defaultEscapeString,
  usesOffsetPagination: true,
  textEditorMode: "text/x-sql",
  // Stage 1 is read-mostly: metadata browsing, queries, table data and
  // exports work; schema/data modification is disabled.
  disabledFeatures: {
    shell: true,
    manualCommit: true,
    resultEditing: true,
    comments: true,
    alter: {
      everything: true,
      addColumn: true,
      dropColumn: true,
      renameColumn: true,
      alterColumn: true,
      alterDefault: true,
      multiStatement: true,
      addConstraint: true,
      dropConstraint: true,
      indexes: true,
      renameSchema: true,
      renameTable: true,
      renameView: true,
      reorderColumn: true
    },
    createIndex: true,
    createTable: true,
    dropTable: true,
    dropSchema: true,
    duplicateTable: true,
    truncateElement: true,
    importFromFile: true,
    backup: true,
    generatedColumns: true,
    transactions: true,
    sqlCreate: true,
    collations: true,
    addDatabase: true,
    multipleDatabases: true,
    informationSchema: {
      extra: true
    }
  }
}
