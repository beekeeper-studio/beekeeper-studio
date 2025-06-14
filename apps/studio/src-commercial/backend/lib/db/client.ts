// Copyright (c) 2015 The SQLECTRON Team, 2020 Beekeeper Studio team
import { ConnectionType, IDbConnectionDatabase } from "@/lib/db/types"
import { MysqlClient } from '@/lib/db/clients/mysql';
import { PostgresClient } from '@/lib/db/clients/postgresql';
import { SQLServerClient } from '@/lib/db/clients/sqlserver';
import { SqliteClient } from '@/lib/db/clients/sqlite';
import { MariaDBClient } from '@/lib/db/clients/mariadb';
import { TiDBClient } from '@/lib/db/clients/tidb';
import { RedshiftClient } from '@/lib/db/clients/redshift';
import { CockroachClient } from '@/lib/db/clients/cockroach';
import { BigQueryClient } from '@/lib/db/clients/bigquery';
import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { FirebirdClient } from "./clients/firebird";
import { OracleClient } from "./clients/oracle";
import { CassandraClient } from "./clients/cassandra";
import { LibSQLClient } from "./clients/libsql";
import { DuckDBClient } from "./clients/duckdb";
import { ClickHouseClient } from "./clients/clickhouse";
import { MongoDBClient } from "./clients/mongodb";
import { SQLAnywhereClient } from "./clients/anywhere";
import { RedisClient } from '@/lib/db/clients/redis';

const clients = new Map<ConnectionType, any>([
  ['mysql', MysqlClient],
  ['postgresql', PostgresClient],
  ['sqlserver', SQLServerClient],
  ['sqlite', SqliteClient],
  ['redshift', RedshiftClient],
  ['mariadb', MariaDBClient],
  ['tidb', TiDBClient],
  ['cockroachdb', CockroachClient],
  ['bigquery', BigQueryClient],
  ['firebird', FirebirdClient],
  ['oracle', OracleClient],
  ['cassandra', CassandraClient],
  ['libsql', LibSQLClient],
  ['duckdb', DuckDBClient],
  ['clickhouse', ClickHouseClient],
  ['mongodb', MongoDBClient],
  ['sqlanywhere', SQLAnywhereClient],
  ['redis', RedisClient]
], );


class FriendlyErrorClient {
  constructor() {
    throw new Error("Unknown DB type. You need to add a driver -> class mapping in src-commercial/backend/lib/db/client.ts")
  }
}

export class ClientError extends Error {
  helpLink = null
  constructor(message: string, helpLink: string) {
    super(message)
    this.helpLink = helpLink
  }
}

export function createConnection(server: IDbConnectionServer, database: IDbConnectionDatabase ) {
  /**
   * Database public API
   */
  const client = clients.get(server.config.client) || FriendlyErrorClient;
  return new client(server, database);
}
