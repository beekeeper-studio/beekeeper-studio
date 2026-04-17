import _ from "lodash";
import {
  ColumnType,
  DialectData,
  SpecialTypes,
} from "./models";

// https://clickhouse.com/docs/en/sql-reference/data-types
const types = [
  ...SpecialTypes,
  'Int8', 'TINYINT', 'INT1', 'BYTE', 'TINYINT SIGNED', 'INT1 SIGNED',
  'Int16', 'SMALLINT', 'SMALLINT SIGNED',
  'Int32', 'INT', 'INTEGER', 'MEDIUMINT', 'MEDIUMINT SIGNED', 'INT SIGNED', 'INTEGER SIGNED',
  'Int64', 'BIGINT', 'SIGNED', 'BIGINT SIGNED', 'TIME',
  'Int128', 'Int256',
  'UInt8', 'TINYINT UNSIGNED', 'INT1 UNSIGNED',
  'UInt16', 'SMALLINT UNSIGNED',
  'UInt32', 'MEDIUMINT UNSIGNED', 'INT UNSIGNED', 'INTEGER UNSIGNED',
  'UInt64', 'UNSIGNED', 'BIGINT UNSIGNED', 'BIT', 'SET',
  'UInt128', 'UInt256',
  'Float32', 'FLOAT', 'REAL', 'SINGLE',
  'Float64', 'DOUBLE', 'DOUBLE PRECISION',
  'Bool',
  'String', 'LONGTEXT', 'MEDIUMTEXT', 'TINYTEXT', 'TEXT', 'LONGBLOB', 'MEDIUMBLOB', 'TINYBLOB', 'BLOB', 'VARCHAR', 'CHAR',
            'CHAR LARGE OBJECT', 'CHAR VARYING', 'CHARACTER LARGE OBJECT', 'CHARACTER VARYING', 'NCHAR LARGE OBJECT', 'NCHAR VARYING',
            'NATIONAL CHARACTER LARGE OBJECT', 'NATIONAL CHARACTER VARYING', 'NATIONAL CHAR VARYING', 'NATIONAL CHARACTER', 'NATIONAL CHAR',
            'BINARY LARGE OBJECT', 'BINARY VARYING',
  'FixedString(N)',
  'Date', 'Date32', 'DateTime', 'DateTime(timezone)', 'DateTime64(precision)', 'DateTime64(precision, timezone)',
  'JSON',
  'UUID',
  "Enum", "Enum8", "Enum16",
  "LowCardinality(T)",
  'Array(T)',
  'Map(K, V)',
  'SimpleAggregateFunction(name, T...)',
  'AggregateFunction(name, T...)',
  'Nested(T1, T2, ...)',
  'tuple(T1, T2, ...)',
  'Nullable(T)',
  'IPv4', 'IPv6',
  'Point', 'Ring', 'Polygon', 'MultiPolygon',
]

const defaultLength = (t: string) => t.startsWith('var') ? 255 : 8

const UNWRAPPER = /^`(.*)`$/

class ClickHouseColumnType extends ColumnType {
  // ClickHouse data types are case sensitive
  get pretty() {
    return this.name;
  }
}

export const ClickHouseData: DialectData = {
  sqlLabel: "SQL",
  columnTypes: types.map((t) => new ClickHouseColumnType(t, false, defaultLength(t))),
  constraintActions: [],
  wrapIdentifier(value: string) {
    return (value !== '*' ? `"${value.replaceAll(/"/g, '""')}"` : '*');
  },
  usesOffsetPagination: true,
  editorFriendlyIdentifier: (s) => s,
  escapeString(value: any, quote?: boolean) {
    if (!value) return null
    const result = `${value.toString().replaceAll(/'/g, "''")}`
    return quote ? `'${result}'` : result
  },
  requireDataset: false,
  disallowedSortColumns: ['longblob', 'mediumblob', 'tinyblob', 'blob', 'json', 'array(t)', 'map(k, v)'],
  wrapLiteral(value: string) {
    return value.replaceAll(';', '')
  },
  unwrapIdentifier(value: string) {
    const matched = value.match(UNWRAPPER);
    return matched ? matched[1] : value;
  },
  importDataType: {
    stringType: 'String',
    longStringType: 'String',
    dateType: 'Date',
    booleanType: 'Bool',
    integerType: 'INT',
    numberType: 'DOUBLE',
    defaultType: 'String'
  },
  textEditorMode: "text/x-mysql",
  versionWarnings: [
    {
      minVersion: { major: 23, minor: 0, patch: 0},
      warning: "FYI: Beekeeper Studio supports ClickHouse v23+, you may experience buggy behavior for earlier versions"
    }
  ],
  disabledFeatures: {
    manualCommit: true,
    shell: true,
    triggers: true,
    compositeKeys: true,
    foreignKeys: true,
    createIndex: true,
    generatedColumns: true,
    alter: {
      multiStatement: true,
      renameSchema: true,
      reorderColumn: true
    },
    transactions: true,
    chunkSizeStream: true,
    // Clickhouse doesn't have binary types
    binaryColumn: true,
    // Sorting can slow down queries
    initialSort: true,
    // TODO (azmi): in progress
    importFromFile: true,
  },
}
