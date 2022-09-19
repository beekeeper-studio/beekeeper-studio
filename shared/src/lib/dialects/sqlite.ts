import { ColumnType, defaultConstraintActions, defaultEscapeString, defaultWrapIdentifier, defaultWrapLiteral, DialectData, SpecialTypes } from "./models"


const types = [
  ...SpecialTypes,
  'int', 'int2', 'int8', 'integer', 'tinyint', 'smallint', 'mediumint', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'double precision', 'datetime', 'varying character', 'character', 'native character', 'varchar', 'nchar', 'nvarchar2', 'unsigned big int', 'boolean', 'blob', 'text', 'clob', 'date'
]

const supportsLength = [
  'char', 'varchar'
]

const defaultLength = (t: string) => t.startsWith('var') ? 255 : 8


export const SqliteData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [...defaultConstraintActions, 'RESTRICT'],
  escapeString: defaultEscapeString,
  wrapLiteral: defaultWrapLiteral,
  wrapIdentifier: defaultWrapIdentifier,
  disabledFeatures: {
    comments: true,
    alter: {
      alterColumn: true,
      multiStatement: true,
      addConstraint: true,
      dropConstraint: true,
    },
    informationSchema: {
      extra: true
    },
  },
  notices: {
    infoSchema: "Note: SQLite does not support any column alterations except renaming"
  }
}
