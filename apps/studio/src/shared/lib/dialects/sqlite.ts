import {
  ColumnType,
  defaultConstraintActions,
  defaultEscapeString,
  defaultWrapIdentifier,
  defaultWrapLiteral,
  DialectData,
  SpecialTypes,
} from "./models";

const types = [
  ...SpecialTypes,
  'int', 'int2', 'int8', 'integer', 'tinyint', 'smallint', 'mediumint', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'double precision', 'datetime', 'varying character', 'character', 'native character', 'varchar', 'nchar', 'nvarchar2', 'unsigned big int', 'boolean', 'blob', 'text', 'clob', 'date'
]

const supportsLength = [
  'char', 'varchar'
]

const defaultLength = (t: string) => t.startsWith('var') ? 255 : 8

const UNWRAPPER = /^(?:`(.*)`|'(.*)'|"(.*)")$/

export const SqliteData: DialectData = {
  sqlLabel: "SQL",
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [...defaultConstraintActions, 'RESTRICT'],
  escapeString: defaultEscapeString,
  wrapLiteral: defaultWrapLiteral,
  wrapIdentifier: defaultWrapIdentifier,
  usesOffsetPagination: true,
  importDataType: {
    stringType: 'varchar(255)',
    longStringType: 'text',
    dateType: 'date',
    booleanType: 'boolean',
    integerType: 'integer',
    numberType: 'float',
    defaultType: 'varchar(255)'
  },
  requireDataset: false,
  disallowedSortColumns: ['blob'],
  editorFriendlyIdentifier: (s) => s,
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    if (matched) return matched[1] || matched[2] || matched[3];
    return value;
  },
  textEditorMode: "text/x-sqlite",
  disabledFeatures: {
    manualCommit: true,
    shell: true,
    schema: true,
    comments: true,
    compositeKeys: true,
    alter: {
      alterColumn: true,
      multiStatement: true,
      addConstraint: true,
      dropConstraint: true,
      renameView: true,
      renameSchema: true,
      reorderColumn: true,
    },
    informationSchema: {
      extra: true
    },
    multipleDatabases: true,
  },
  notices: {
    infoSchema: "Note: SQLite does not support any column alterations except renaming"
  },
  boolean: {
    true: BigInt(1),
    false: BigInt(0),
  },
}
