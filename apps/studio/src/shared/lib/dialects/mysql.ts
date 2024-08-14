import _ from "lodash";
import {
  ColumnType,
  defaultConstraintActions,
  defaultEscapeString,
  DialectData,
  SpecialTypes,
} from "./models";

const types = [
  ...SpecialTypes,
  'bit', 'int', 'int unsigned', 'integer', 'integer unsigned', 'tinyint', 'tinyint unsigned',
  'smallint', 'smallint unsigned', 'mediumint', 'mediumint unsigned', 'bigint', 'bigint unsigned',
  'float', 'double', 'double precision', 'dec', 'decimal', 'numeric', 'fixed', 'bool', 'boolean', 'date', 'datetime', 'timestamp', 'time', 'year', 'char', 'nchar', 'national char', 'varchar', 'nvarchar', 'national varchar', 'text', 'tinytext', 'mediumtext', 'blob', 'longtext', 'tinyblob', 'mediumblob', 'longblob', 'enum', 'set', 'json', 'binary', 'varbinary', 'geometry', 'point', 'linestring', 'polygon', 'multipoint', 'multilinestring', 'multipolygon', 'geometrycollection',
]

const supportsLength = [
  'varchar', 'char'
]

const defaultLength = (t: string) => t.startsWith('var') ? 255 : 8

const UNWRAPPER = /^`(.*)`$/

export const MysqlData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [...defaultConstraintActions, 'RESTRICT'],
  wrapIdentifier(value: string) {
    return (value !== '*' ? `\`${value.replaceAll(/`/g, '``')}\`` : '*');
  },
  usesOffsetPagination: true,
  editorFriendlyIdentifier: (s) => s,
  escapeString: defaultEscapeString,
  requireDataset: false,
  wrapLiteral(value: string) {
    return value.replaceAll(';', '')
  },
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    return matched ? matched[1] : value;
  },
  textEditorMode: "text/x-mysql",
  disabledFeatures: {
    alter: {
      multiStatement: true,
      renameSchema: true,
    }
  },
  notices: {
    infoIndexes: 'Only ascending indexes are supported in MySQL before version 8.0.'
  }
}
