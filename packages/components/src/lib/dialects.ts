import { DialectData } from "./dialects/models";
import { MysqlData } from "./dialects/mysql";
import { PostgresData } from "./dialects/postgresql";
import { SqliteData } from "./dialects/sqlite";
import { SqlServerData } from "./dialects/sqlserver";

type SqlServer = "mssql" | "sqlserver"
export type Dialect = "postgresql" | "sqlite" | SqlServer | "mysql"


export type DialectOverride = {
  [K in Dialect]: string
}

export function getDialectData(dialect: Dialect): DialectData  {
  switch (dialect) {
    case "postgresql":
      return PostgresData
    case "mysql":
      return MysqlData
    case "sqlserver":
    case "mssql":
      return SqlServerData
    case "sqlite":
      return SqliteData
    default:
      return SqliteData
  }
}