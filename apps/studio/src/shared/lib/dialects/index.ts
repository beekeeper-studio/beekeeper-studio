import { RedshiftData } from "@shared/lib/dialects/redshift";
import { BigQueryData } from "./bigquery";
import { FirebirdData } from "./firebird";
import { Dialect, DialectData } from "./models";
import { MysqlData } from "./mysql";
import { OracleData } from "./oracle";
import { PostgresData } from "./postgresql";
import { SqliteData } from "./sqlite";
import { SqlServerData } from "./sqlserver";
import { CassandraData } from './cassandra'
import { ClickHouseData } from "./clickhouse";

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
    case 'oracle':
      return OracleData
    case 'cassandra':
      return CassandraData
    case 'bigquery':
      return BigQueryData
    case 'firebird':
      return FirebirdData
    case 'clickhouse':
      return ClickHouseData
    default:
      return SqliteData
  }
}
