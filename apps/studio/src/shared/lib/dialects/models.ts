import _ from 'lodash'
import CodeMirror from 'codemirror'

const communityDialects = ['postgresql', 'sqlite', 'sqlserver', 'mysql', 'redshift', 'bigquery'] as const
const ultimateDialects = ['oracle', 'cassandra', 'firebird', 'clickhouse', 'mongodb', 'duckdb'] as const

export const Dialects = [...communityDialects, ...ultimateDialects] as const


export const SpecialTypes = ['autoincrement']
export type Dialect = typeof Dialects[number]

export function isUltimateDialect(d: any) {
  return ultimateDialects.includes(d)
}
export function dialectFor(s: string): Dialect | null {
  switch (s) {
    case 'cockroachdb':
      return 'postgresql'
    case 'mariadb':
    case 'tidb':
      return 'mysql'
    case 'libsql':
      return 'sqlite'
    case 'mssql':
      return 'sqlserver'
    default:
      return Dialects.find((d) => d === s) || null
  }
}


export const DialectTitles: {[K in Dialect]: string} = {
  postgresql: "Postgres",
  mysql: "MySQL",
  sqlserver: "SQL Server",
  redshift: "Amazon Redshift",
  sqlite: "SQLite",
  cassandra: "Apache Cassandra",
  bigquery: "BigQuery",
  firebird: "Firebird",
  oracle: "Oracle Database",
  duckdb: "DuckDB",
  clickhouse: "ClickHouse",
  mongodb: "MongoDB"
}

export const KnexDialects = ['postgres', 'sqlite3', 'mssql', 'redshift', 'mysql', 'oracledb', 'firebird', 'cassandra-knex']
export type KnexDialect = typeof KnexDialects[number]

export function KnexDialect(d: Dialect): KnexDialect {
  if (d === 'sqlserver') return 'mssql'
  if (d === 'sqlite') return 'sqlite3'
  if (d === 'oracle') return 'oracledb'
  if (d === 'cassandra') return 'cassandra-knex'
  return d as KnexDialect
}
// REF: https://github.com/sql-formatter-org/sql-formatter/blob/master/docs/language.md#options
export type FormatterDialect = 'postgresql' | 'mysql' | 'mariadb' | 'sql' | 'tsql' | 'redshift' | 'plsql' | 'db2' | 'sqlite'
export function FormatterDialect(d: Dialect): FormatterDialect {
  if (!d) return 'mysql'
  if (d === 'sqlserver') return 'tsql'
  if (d === 'sqlite') return 'sqlite'
  if (d === 'oracle') return 'plsql'
  if (d === 'postgresql') return 'postgresql'
  if (d === 'redshift') return 'redshift'
  if (d === 'cassandra') return 'sql'
  if (d === 'duckdb') return 'sql'
  return 'mysql' // we want this as the default
}


export class ColumnType {
  public name: string
  public supportsLength: boolean
  public defaultLength: number
  constructor(name: string, supportsLength?: boolean, defaultLength = 255) {
    this.name = name
    this.supportsLength = supportsLength
    this.defaultLength = defaultLength
  }

  get pretty() {
    if (this.supportsLength) {
      return `${this.name.toUpperCase()}(${this.defaultLength})`
    }
    return this.name.toUpperCase()
  }
}

export interface DialectData {
  columnTypes?: ColumnType[],
  constraintActions?: string[]
  wrapIdentifier?: (s: string) => string
  editorFriendlyIdentifier?: (s: string) => string
  escapeString?: (s: string, quote?: boolean) => string
  wrapLiteral?: (s: string) => string
  unwrapIdentifier?: (s: string) => string
  textEditorMode?: CodeMirror.EditorConfiguration['mode']
  defaultSchema?: string
  usesOffsetPagination?: boolean
  requireDataset?: boolean,
  disabledFeatures?: {
    queryEditor?: boolean
    informationSchema?: {
      extra?: boolean
    }
    tableTable?: boolean,
    indexes?: boolean,
    alter?: {
      addColumn?: boolean
      dropColumn?: boolean
      renameColumn?: boolean
      alterColumn?: boolean
      multiStatement?: boolean
      addConstraint?: boolean
      dropConstraint?: boolean
      everything?: boolean
      indexes?: boolean
      renameSchema?: boolean
      renameTable?: boolean
      renameView?: boolean
      reorderColumn?: boolean
    },
    triggers?: boolean,
    relations?: boolean,
    constraints?: {
      onUpdate?: boolean,
      onDelete?: boolean
    }
    index?: {
      id?: boolean,
      desc?: boolean,
      primary?: boolean
    }
    primary?: boolean // for mongo
    defaultValue?: boolean
    nullable?: boolean
    createIndex?: boolean
    comments?: boolean
    filterWithOR?: boolean
    backup?: boolean
    truncateElement?: boolean
    exportTable?: boolean
    createTable?: boolean
    collations?: boolean
    importFromFile?: boolean,
    headerSort?: boolean,
    duplicateTable?: boolean,
    export?: {
      sql?: boolean
    }
    schema?: boolean
    multipleDatabases?: boolean
    generatedColumns?: boolean
    transactions?: boolean
    chunkSizeStream?: boolean
    binaryColumn?: boolean
    initialSort?: boolean
    multipleDatabase?: boolean
  },
  notices?: {
    infoSchema?: string
    infoIndexes?: string
    infoRelations?: string
    infoTriggers?: string
    tableTable?: string
    query?: string
  },
  defaultColumnType?: string
  charsets?: string[]|null
  boolean?: {
    true: any
    false: any
  }
}

export const defaultConstraintActions = [
  'NO ACTION',
  'SET NULL',
  'SET DEFAULT',
  'CASCADE'
]


export function defaultEscapeString(value: string, quote?: boolean): string {
  if (!value) return null
  const result = `${value.toString().replaceAll(/'/g, "''")}`
  return quote ? `'${result}'` : result
}

export function defaultWrapLiteral(str: string): string {
  return str ? str.replaceAll(/;/g, '') : '';
}

export function defaultWrapIdentifier(value: string): string {
  return value ? `"${value.replaceAll(/"/g, '""')}"` : ''
}

const maybeWrapIdentifierRegex = /(?:[^a-z0-9_]|^\d)/;

export function friendlyNormalizedIdentifier(value: string, quote: '`' | "'" | '"' = '"', tester?: RegExp): string {
  const regex = tester || maybeWrapIdentifierRegex
  return regex.test(value) ? `${quote}${value}${quote}` : value;
}

export interface SchemaConfig {
  dataType: string
  nullable?: boolean
  unsigned?: boolean
  comment?: string
  defaultValue?: string
  primaryKey?: boolean
  extra?: string
}

// this is the flattened structure we actually render in a component
export interface SchemaItem extends SchemaConfig {
  columnName: string
}

export interface Schema {
  name: string
  schema?: string
  columns: SchemaItem[]
}

export interface SchemaItemChange {
  changeType: 'columnName' | 'dataType' | 'nullable' | 'defaultValue' | 'comment' | 'extra' | 'position'
  columnName: string
  newValue: string | boolean | null
}

export interface AlterTableSpec {
  table: string
  schema?: string
  database?: string
  alterations?: SchemaItemChange[]
  adds?: SchemaItem[]
  drops?: string[]
  reorder? : { newOrder: SchemaItem[], oldOrder: SchemaItem[] } | null
}

export interface PartitionExpressionChange {
  partitionName: string
  newValue: string
}

export interface PartitionItem {
  name: string
  expression: string
}

export interface AlterPartitionsSpec {
  table: string
  alterations?: PartitionExpressionChange[]
  adds?: PartitionItem[]
  detaches?: string[]
}

export interface IndexColumn {
  name: string
  order: 'ASC' | 'DESC' | '2d' | '2dsphere' | 'text' | 'geoHaystack' | 'hashed' | number // after DESC is for mongo only
  prefix?: number | null // MySQL Only
}

export interface CreateIndexSpec {
  name?: string
  columns: IndexColumn[]
  unique: boolean
  order?: 'ASC' | 'DESC' // Set order for entire index. Used in firebird.
  prefix?: number | null // MySQL Only
}

export interface DropIndexSpec {
  name: string
}

export interface IndexAlterations {
  additions: CreateIndexSpec[]
  drops: DropIndexSpec[]
  table: string
  schema?: string
}



export interface CreateRelationSpec {
  toTable: string;
  toSchema?: string;
  toColumn: string;
  fromColumn: string;
  constraintName?: string;
  onUpdate?: string;
  onDelete?: string;
}


export type DialectConfig = {
  [K in Dialect]?: SchemaConfig
}


export interface TableKey {
  toTable: string;
  toSchema: string;
  toColumn: string;
  fromTable: string;
  fromSchema: string;
  fromColumn: string;
  constraintName?: string;
  onUpdate?: string;
  onDelete?: string;
}

export interface RelationAlterations {
  additions: CreateRelationSpec[],
  drops: string[]
  table: string
  schema?: string
}
