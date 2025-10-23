import _ from "lodash";
import {
  ColumnType,
  defaultConstraintActions,
  defaultEscapeString,
  defaultWrapLiteral,
  DialectData,
  SpecialTypes,
} from "./models";

const types = [
  ...SpecialTypes,
  'int', 'bigint', 'bit', 'decimal', 'money', 'numeric', 'smallint', 'smallmoney', 'tinyint', 'float', 'real', 'date', 'datetime2', 'datetime', 'datetimeoffset', 'smalldatetime', 'time', 'char', 'varchar', 'text', 'nchar', 'nvarchar', 'ntext', 'binary', 'image', 'varbinary', 'hierarchyid', 'sql_variant', 'timestamp', 'uniqueidentifier', 'xml', 'geometry', 'geography', 'rowversion'
]

const supportsLength = [
  'char', 'varchar', 'nvarchar', 'nchar', 'varbinary'
]

const defaultLength = (t: string) => t.includes('var') ? 255 : 8

export interface DefaultConstraint {
  name: string
  column: string
  schema: string
  table: string
}

const UNWRAPPER = /^"(.*)"$/

export const SqlServerData: DialectData = {
  sqlLabel: "SQL",
  defaultSchema: 'dbo',
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [...defaultConstraintActions],
  wrapIdentifier: (value) =>   _.isString(value) ?
    (value !== '*' ? `[${value.replace(/\]/g, ']]')}]` : '*') : value,
  editorFriendlyIdentifier: (s) => s,
  wrapLiteral: defaultWrapLiteral,
  requireDataset: false,
  importDataType: {
    stringType: 'varchar(255)',
    longStringType: 'nvarchar(max)',
    dateType: 'date',
    booleanType: 'bit',
    integerType: 'int',
    numberType: 'float',
    defaultType: 'varchar(255)'
  },
  disallowedSortColumns: ['geometry', 'xml'],
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    return matched ? matched[1] : value;
  },
  escapeString: defaultEscapeString,
  usesOffsetPagination: true,
  /**
   * Fix #1985 by using text/x-sql instead of text/x-mssql.
   * For some reason, text/x-mssql messes up the editor.getToken()
   * function which is used for autocomplete.
   **/
  textEditorMode: "text/x-sql",
  disabledFeatures: {
    shell: true,
    alter: {
      multiStatement: true,
      renameSchema: true,
      reorderColumn: true,
    },
    informationSchema: {
      extra: true
    }
  }

}
