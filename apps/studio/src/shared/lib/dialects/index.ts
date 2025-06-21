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
import { DuckDBData } from "./duckdb";
import { ClickHouseData } from "./clickhouse";
import { MongoDBData } from "./mongodb";
import { SqlAnywhereData } from "./anywhere";
import { RedisData } from "@shared/lib/dialects/redis";

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
    case 'duckdb':
      return DuckDBData
    case 'clickhouse':
      return ClickHouseData
    case 'mongodb':
      return MongoDBData
    case 'sqlanywhere':
      return SqlAnywhereData
    case 'redis':
      return RedisData
    default:
      return SqliteData
  }
}
