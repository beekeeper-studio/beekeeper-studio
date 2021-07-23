import _ from 'lodash'

export const Dialects = ['postgresql', 'sqlite', 'sqlserver', 'mysql', 'redshift'] as const

export const SpecialTypes = ['autoincrement']
export type Dialect = typeof Dialects[number]

export function dialectFor(s: string): Dialect | null {
  switch (s) {
    case 'cockroachdb':
      return 'postgresql'
      break;
    case 'mariadb':
      return 'mysql'
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
  sqlite: "SQLite"
}

export const KnexDialects = ['postgres', 'sqlite3', 'mssql', 'sqlite3', 'redshift', 'mysql']
export type KnexDialect = typeof KnexDialects[number]

export function KnexDialect(d: Dialect): KnexDialect {
  if (d === 'sqlserver') return 'mssql'
  if (d === 'sqlite') return 'sqlite3'
  return d as KnexDialect
}



export class ColumnType {
  public name: string
  public supportsLength: boolean
  public defaultLength: number
  constructor(name: string, supportsLength?: boolean, defaultLength: number = 255) {
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
  columnTypes: ColumnType[]
  wrapIdentifier: (s: string) => string
  escapeString: (s: string, quote?: boolean) => string
  wrapLiteral: (s: string) => string
  disabledFeatures?: {
    alter?: {
      addColumn?: boolean
      dropColumn?: boolean
      renameColumn?: boolean
      alterColumn?: boolean
      multiStatement?: boolean
    },
    comments?: boolean
  }
}

export function defaultEscapeString(value: string, quote?: boolean): string {
  if (!value) return null
  const result = `${value.replaceAll(/'/g, "''")}`
  return quote ? `'${result}'` : result
}

export function defaultWrapLiteral(str: string): string {
  return str ? str.replaceAll(/;/g, '') : '';
}

export function defaultWrapIdentifier(value: string): string {
  return value ? `"${value.replaceAll(/"/g, '""')}"` : ''
}

export interface SchemaConfig {
  dataType: string
  nullable?: boolean
  unsigned?: boolean
  comment?: string
  defaultValue?: string
  primaryKey?: boolean
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
  changeType: 'columnName' | 'dataType' | 'nullable' | 'defaultValue' | 'comment'
  columnName: string
  newValue: string | boolean | null
}

export interface AlterTableSpec {
  table: string
  schema?: string
  alterations?: SchemaItemChange[]
  adds?: SchemaItem[]
  drops?: string[]
}

export type DialectConfig = {
  [K in Dialect]: SchemaConfig
}
