
export const Dialects = ['postgresql', 'sqlite', 'sqlserver', 'mysql', 'redshift'] as const
export type Dialect = typeof Dialects[number]

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
      return `${this.name}(${this.defaultLength})`
    } 
    return this.name
  }
}

export interface DialectData {
  columnTypes: ColumnType[]
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
  columns: SchemaItem[]
}