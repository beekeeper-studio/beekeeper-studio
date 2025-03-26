import { ColumnType, defaultConstraintActions, defaultEscapeString, defaultWrapIdentifier, defaultWrapLiteral, DialectData, SpecialTypes } from "./models"


const types = [
  ...SpecialTypes,
  'varchar2',
  'nvarchar2',
  'number',
  'long',
  'date',
  'binary_float',
  'binary_double',
  'timestamp',
  'timestamp with time zone',
  'timestamp with local time zone',
  'interval year to month',
  'interval day to second',
  'raw',
  'long raw',
  'rowid',
  'urowid',
  'char',
  'nchar',
  'clob',
  'nclob',
  'blob',
  'bfile',
]

const supportsLength = [
  'char', 'varchar2', 'number', 'raw', 'nchar', 'nvarchar2'
]

const defaultLength = (t: string) => t.startsWith('var') ? 255 : 8

const UNWRAPPER = /^"(.*)"$/

export const OracleData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [...defaultConstraintActions, 'RESTRICT'],
  escapeString: defaultEscapeString,
  wrapLiteral: defaultWrapLiteral,
  wrapIdentifier: defaultWrapIdentifier,
  editorFriendlyIdentifier: (s) => s,
  usesOffsetPagination: true,
  requireDataset: false,
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    return matched ? matched[1] : value;
  },
  textEditorMode: "text/x-sql",
  disabledFeatures: {
    initialSort: true,
    export: {
      sql: true
    },
    informationSchema: {
      extra: true
    },
    alter: {
      renameSchema: true,
      reorderColumn: true,
    },
  },
  notices: {
  },
  defaultColumnType: 'VARCHAR2(255)'
}
