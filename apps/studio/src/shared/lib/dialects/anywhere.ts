import _ from "lodash";
import {
  ColumnType,
  defaultConstraintActions,
  defaultEscapeString,
  defaultWrapLiteral,
  DialectData,
  SpecialTypes,
} from "./models";

const UNWRAPPER = /^\[(.*)\]$/;

// SQL Anywhere data types based on SAP documentation
const types = [
  ...SpecialTypes,
  'bigint', 'binary', 'bit', 'char', 'date', 'datetime', 'decimal', 'double',
  'float', 'image', 'int', 'integer', 'long binary', 'long varchar', 'money',
  'numeric', 'real', 'smalldatetime', 'smallint', 'smallmoney', 'text',
  'time', 'timestamp', 'tinyint', 'varbinary', 'varchar'
];

// Types that support length specification
const supportsLength = [
  'binary', 'char', 'varbinary', 'varchar'
];

// Types that support precision and scale
const supportsPrecisionScale = [
  'decimal', 'numeric'
];

const defaultLength = (t: string) => t.includes('var') ? 255 : 8;

export const SqlAnywhereData: DialectData = {
  defaultSchema: 'dbo',
  sqlLabel: "SQL",
  columnTypes: types.map((t) => {
    const supportsLen = supportsLength.includes(t);
    const supportsPrecScale = supportsPrecisionScale.includes(t);
    return new ColumnType(t, supportsLen || supportsPrecScale, defaultLength(t));
  }),
  constraintActions: [...defaultConstraintActions],
  wrapIdentifier: (value) => _.isString(value) ?
    (value !== '*' ? `[${value.replace(/\]/g, ']]')}]` : '*') : value,
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
  disabledFeatures: {
    shell: true,
    manualCommit: true,
    comments: true,
    alter: {
      multiStatement: true,
      renameSchema: true,
      reorderColumn: true
    },
    importFromFile: true,
    dropSchema: true,
    informationSchema: {
      extra: true
    }
  }
}
