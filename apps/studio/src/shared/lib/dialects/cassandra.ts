import _ from "lodash"
import { ColumnType, defaultConstraintActions, defaultEscapeString, DialectData  } from "./models"

// https://cassandra.apache.org/doc/latest/cassandra/cql/types.html
const types = [
  'ascii', 'bigint', 'blob', 'boolean', 'counter', 'date', 'decimal', 'double', 'duration', 'float', 'inet', 'int', 'smallint', 'text', 'time', 'timestamp', 'timeuuid', 'tinyint', 'uuid', 'varchar', 'varint'
]

const supportsLength = []

// Couldn't find a function in the cassandra-driver api which found these, so ripped it out and can map it using the type.code.
// https://github.com/datastax/nodejs-driver/blob/388418dd7d9cf7c0e1e8a803a7791458268c9ad6/lib/types/index.js#L48
export const dataTypesToMatchTypeCode = [
  'custom',
  'ascii',
  'bigint',
  'blob',
  'boolean',
  'counter',
  'decimal',
  'double',
  'float',
  'int',
  'text',
  'timestamp',
  'uuid',
  'varchar',
  'varint',
  'timeuuid',
  'inet',
  'date',
  'time',
  'smallint',
  'tinyint',
  'list',
  'map',
  'set',
  'udt',
  'tuple'
]

const defaultLength = (t: string) => t.startsWith('var') ? 255 : 8

const UNWRAPPER = /^`(.*)`$/

export const CassandraData: DialectData = {
  sqlLabel: "SQL",
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t))),
  constraintActions: [...defaultConstraintActions, 'RESTRICT'],
  wrapIdentifier(value: string) {
    return (value !== '*' ? `"${value.replaceAll(/`/g, '""')}"` : '*')
  },
  editorFriendlyIdentifier: (s) => s,
  escapeString: defaultEscapeString,
  wrapLiteral(value: string) {
    return value.replaceAll(';', '')
  },
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    return matched ? matched[1] : value;
  },
  importDataType: {
    stringType: 'varchar(255)',
    longStringType: 'text',
    dateType: 'date',
    booleanType: 'boolean',
    integerType: 'int',
    numberType: 'decimal',
    defaultType: 'varchar(255)'
  },
  usesOffsetPagination: false,
  requireDataset: false,
  textEditorMode: "text/x-cassandra",
  disabledFeatures: {
    manualCommit: true,
    shell: true,
    defaultValue: true,
    compositeKeys: true,
    alter: {
      alterColumn: true,
      multiStatement: true,
      renameSchema: true,
      renameTable: true,
      renameView: true,
      reorderColumn: true
    },
    triggers: true,
    relations: true,
    informationSchema: {
      extra: true
    },
    nullable: true,
    createIndex: true,
    filterWithOR: true,
    importFromFile: true,
    duplicateTable: true,
    headerSort: true
  },
  defaultColumnType: 'varchar',
  notices: {
    infoTriggers: 'Triggers do not exist in Cassandra',
    infoRelations: 'Relations do not exist in Cassandra'
  }
}
