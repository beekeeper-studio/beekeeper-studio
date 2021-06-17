


type SqlServer = "mssql" | "sqlserver"
export type Dialect = "postgresql" | "sqlite" | SqlServer | "mysql"


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
  special?: string
  nullable?: boolean
  defaultValue?: string
  primaryKey?: boolean
}


export type DialectConfig = {
  [K in Dialect]: SchemaConfig
}

export interface SchemaItem {
  columnName: string
  config: SchemaConfig
  dialectConfigs?: DialectConfig
}