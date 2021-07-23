import _ from "lodash"
import { ColumnType, defaultEscapeString, defaultWrapLiteral, DialectData, SpecialTypes } from "./models"


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

export const SqlServerData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  wrapIdentifier: (value) =>   _.isString(value) ?
    (value !== '*' ? `[${value.replace(/\[/g, '[')}]` : '*') : value,
  wrapLiteral: defaultWrapLiteral,
  escapeString: defaultEscapeString,
  disabledFeatures: {
    alter: {
      multiStatement: true
    }
  }

}