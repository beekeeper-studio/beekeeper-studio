import {
  ColumnType,
  defaultConstraintActions,
  defaultEscapeString,
  friendlyNormalizedIdentifier,
  defaultWrapLiteral,
  DialectData,
  SpecialTypes,
} from "./models";

const types = [
  ...SpecialTypes,
  'serial', 'smallserial', 'bigserial', 'int', 'int2', 'int4', 'int8', 'smallint', 'integer', 'bigint', 'decimal', 'numeric', 'real', 'float', 'float4', 'float8', 'double precision', 'money', 'character varying', 'varchar', 'character', 'char', 'text', 'citext', 'hstore', 'bytea', 'bit', 'varbit', 'bit varying', 'timetz', 'timestamptz', 'timestamp', 'timestamp without time zone', 'timestamp with time zone', 'date', 'time', 'time without time zone', 'time with time zone', 'interval', 'bool', 'boolean', 'enum', 'point', 'line', 'lseg', 'box', 'path', 'polygon', 'circle', 'cidr', 'inet', 'macaddr', 'tsvector', 'tsquery', 'uuid', 'xml', 'json', 'jsonb', 'int4range', 'int8range', 'numrange', 'tsrange', 'tstzrange', 'daterange', 'geometry', 'geography', 'cube', 'ltree'
]

const supportsLength = [
  'varchar', 'char', 'character varying', 'character'
]

const defaultLength =(t: string) => {
  if (t.startsWith('var')) return 255
  return 8
}

// copied from https://www.postgresql.org/docs/12/multibyte.html as there is no way to get this via sql command unlike mysql
const charsets = [
  'BIG5', 'EUC_CN', 'EUC_JP', 'EUC_JIS_2004', 'EUC_KR', 'EUC_TW', 'GB18030', 'GBK', 'ISO_8859_5', 'ISO_8859_6', 'ISO_8859_7', 'ISO_8859_8', 'JOHAB', 'KOI8R', 'KOI8U', 'LATIN1', 'LATIN2', 'LATIN3', 'LATIN4', 'LATIN5', 'LATIN6', 'LATIN7', 'LATIN8', 'LATIN9', 'LATIN10', 'MULE_INTERNAL', 'SJIS', 'SHIFT_JIS_2004', 'SQL_ASCII', 'UHC', 'UTF8', 'WIN866', 'WIN874', 'WIN1250', 'WIN1251', 'WIN1252', 'WIN1253', 'WIN1254', 'WIN1255', 'WIN1256', 'WIN1257', 'WIN1258'
]

const UNWRAPPER = /^"(.*)"$/

export const PostgresData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [...defaultConstraintActions, 'RESTRICT'],
  wrapIdentifier: (id: string) => id ? `"${id.replaceAll(/"/g, '""')}"` : null,
  editorFriendlyIdentifier: (s) => friendlyNormalizedIdentifier(s, '"'),
  escapeString: defaultEscapeString,
  wrapLiteral: defaultWrapLiteral,
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    return matched ? matched[1] : value;
  },
  disabledFeatures: {
    informationSchema: {
      extra: true
    }
  },
  charsets
}

