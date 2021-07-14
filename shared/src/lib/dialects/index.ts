import { Dialect, DialectData } from "./models";
import { MysqlData } from "./mysql";
import { PostgresData } from "./postgresql";
import { SqliteData } from "./sqlite";
import { SqlServerData } from "./sqlserver";

export function getDialectData(dialect: Dialect): DialectData  {
  switch (dialect) {
    case "postgresql":
      return PostgresData
    case "mysql":
      return MysqlData
    case "sqlserver":
      return SqlServerData
    case "sqlite":
      return SqliteData
    default:
      return SqliteData
  }
}