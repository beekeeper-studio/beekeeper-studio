import {
  ColumnType,
  defaultEscapeString,
  friendlyNormalizedIdentifier,
  defaultWrapLiteral,
  DialectData,
  SpecialTypes,
} from "./models";

const types = [
  ...SpecialTypes,
  'int', 'int2', 'int4', 'int8', 'smallint', 'integer', 'bigint', 'decimal', 'numeric', 'real', 'float', 'float4', 'float8', 'double precision', 'money', 'character varying', 'varchar', 'character', 'char', 'text', 'citext', 'hstore', 'bytea', 'bit', 'varbit', 'bit varying', 'timetz', 'timestamptz', 'timestamp', 'timestamp without time zone', 'timestamp with time zone', 'date', 'time', 'time without time zone', 'time with time zone', 'interval', 'bool', 'boolean', 'enum', 'point', 'line', 'lseg', 'box', 'path', 'polygon', 'circle', 'cidr', 'inet', 'macaddr', 'tsvector', 'tsquery', 'uuid', 'xml', 'json'
]

const supportsLength = [
  'varchar', 'char', 'character varying', 'character'
]

const defaultLength = (t: string) => {
  if (t.startsWith('var')) return 255
  return 8
}

export const RedshiftData: DialectData = {
  sqlLabel: "SQL",
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [],
  wrapIdentifier: (id: string) => `"${id.replaceAll(/"/g, '""')}"`,
  editorFriendlyIdentifier: friendlyNormalizedIdentifier,
  escapeString: defaultEscapeString,
  wrapLiteral: defaultWrapLiteral,
  usesOffsetPagination: true,
  requireDataset: false,
  disallowedSortColumns: ['json', 'bytea', 'xml', 'hstore'],
  unwrapIdentifier: (s) => s,
  importDataType: {
    stringType: 'varchar(255)',
    longStringType: 'varchar(max)',
    dateType: 'date',
    booleanType: 'boolean',
    integerType: 'integer',
    numberType: 'float',
    defaultType: 'varchar(255)'
  },
  textEditorMode: "text/x-pgsql",
  disabledFeatures: {
    shell: true,
    alter: {
      multiStatement: true,
      reorderColumn: true
    },
    informationSchema: {
      extra: true
    },
    constraints: {
      onUpdate: true,
      onDelete: true
    },
    createIndex: true,
    initialSort: true,
  }

}
