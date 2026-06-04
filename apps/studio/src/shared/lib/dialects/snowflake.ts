import { ColumnType, defaultEscapeString, defaultWrapLiteral, DialectData } from "./models";

const types = [
  'number', 'decimal', 'numeric', 'int', 'integer', 'bigint', 'smallint', 'tinyint',
  'byteint', 'float', 'float4', 'float8', 'double', 'double precision', 'real', 'decfloat',
  'varchar', 'char', 'character', 'string', 'text', 'binary', 'varbinary', 'boolean', 'date',
  'datetime', 'time', 'timestamp', 'timestamp_ltz', 'timestamp_ntz', 'timestamp_tz', 'variant',
  'object', 'array', 'map', 'file', 'geography', 'geometry', 'uuid', 'vector'
]

const supportsLength = [
  'varchar', 'char', 'character', 'string', 'text', 'binary', 'varbinary'
]

const defaultLength = (t: string) => {
  if (t.startsWith('char')) return 1;
  if (['varchar', 'string', 'text'].includes(t)) return 16777216;
  if (t.includes('binary')) return 8388608;
}

const UNWRAPPER = /^"(.*)"$/

export const SnowflakeData: DialectData = {
  sqlLabel: 'SQL',
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [],
  wrapIdentifier: (value: string): string => {
    if (!value || value === '*') return value;
    return `"${value.replaceAll(/"/g, '""')}"`;
  },
  escapeString: defaultEscapeString,
  wrapLiteral: defaultWrapLiteral,
  usesOffsetPagination: true,
  requireDataset: false,
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    return matched ? matched[1] : value;
  },
  textEditorMode: "text/x-sql",
  disabledFeatures: {
    shell: true,
    alter: {
      indexes: true,
      reorderColumn: true,
      alterDefault: true
    },
    triggers: true,
    backup: true,
    addDatabase: true
  }
}
