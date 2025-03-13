import {
  ColumnType,
  defaultConstraintActions,
  defaultEscapeString,
  friendlyNormalizedIdentifier,
  defaultWrapLiteral,
  DialectData,
  SpecialTypes,
} from "./models";

// Snowflake data types from https://docs.snowflake.com/en/sql-reference/data-types
const types = [
  ...SpecialTypes,
  'number', 'decimal', 'numeric', 'int', 'integer', 'bigint', 'smallint', 
  'float', 'float4', 'float8', 'real', 'double', 'double precision', 
  'varchar', 'char', 'character', 'string', 'text', 
  'binary', 'varbinary', 
  'boolean', 
  'date', 'datetime', 'time', 'timestamp', 'timestamp_ltz', 'timestamp_ntz', 'timestamp_tz',
  'variant', 'object', 'array', 'geography', 'geometry'
];

const supportsLength = [
  'varchar', 'char', 'character', 'string'
];

const defaultLength = (t: string) => {
  if (t.startsWith('var') || t === 'string') return 255;
  return 16;
};

const UNWRAPPER = /^"(.*)"$/;

export const SnowflakeData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [...defaultConstraintActions],
  wrapIdentifier: (id: string) => id ? `"${id.replaceAll(/"/g, '""')}"` : null,
  editorFriendlyIdentifier: (s) => friendlyNormalizedIdentifier(s, '"'),
  escapeString: defaultEscapeString,
  wrapLiteral: defaultWrapLiteral,
  usesOffsetPagination: true,
  defaultSchema: 'PUBLIC',
  requireDataset: false,
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    return matched ? matched[1] : value;
  },
  textEditorMode: "text/x-sql", // Snowflake uses SQL syntax
  disabledFeatures: {
    informationSchema: {
      extra: true
    },
    alter: {
      reorderColumn: true
    }
  },
  // Snowflake doesn't have charsets in the traditional sense
  charsets: ['UTF8']
}