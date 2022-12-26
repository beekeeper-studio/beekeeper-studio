import { RedshiftData } from "@shared/lib/dialects/redshift";
import { Dialect, DialectData } from "./models";
import { MysqlData } from "./mysql";
import { PostgresData } from "./postgresql";
import { SqliteData } from "./sqlite";
import { SqlServerData } from "./sqlserver";

// Fix (part 3 of 3) Issue #1399 - int64s not displaying properly
// Fixes error 'BigInt' is not defined in lib/db/clients/sqlite.js
declare global {
  interface BigIntConstructor {
    toJSON:()=>BigInt;
  }
}

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
    case 'redshift':
      return RedshiftData
    default:
      return SqliteData
  }
}