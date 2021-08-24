import _ from "lodash"
import { ColumnType, defaultConstraintActions, defaultEscapeString, DialectData, SpecialTypes } from "./models"


const types = [
  ...SpecialTypes,
  'bit', 'int', 'integer', 'tinyint', 'smallint', 'mediumint', 'bigint', 'float', 'double', 'double precision', 'dec', 'decimal', 'numeric', 'fixed', 'bool', 'boolean', 'date', 'datetime', 'timestamp', 'time', 'year', 'char', 'nchar', 'national char', 'varchar', 'nvarchar', 'national varchar', 'text', 'tinytext', 'mediumtext', 'blob', 'longtext', 'tinyblob', 'mediumblob', 'longblob', 'enum', 'set', 'json', 'binary', 'varbinary', 'geometry', 'point', 'linestring', 'polygon', 'multipoint', 'multilinestring', 'multipolygon', 'geometrycollection'
]

const supportsLength = [
  'varchar', 'char'
]

const defaultLength = (t: string) => t.startsWith('var') ? 255 : 8

export const MysqlData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [...defaultConstraintActions, 'RESTRICT'],
  wrapIdentifier(value: string) {
    return (value !== '*' ? `\`${value.replaceAll(/`/g, '``')}\`` : '*');
  },
  escapeString: defaultEscapeString,
  wrapLiteral(value: string) {
    return value.replaceAll(';', '')
  },
  disabledFeatures: {
    alter: {
      multiStatement: true
    }
  }
}