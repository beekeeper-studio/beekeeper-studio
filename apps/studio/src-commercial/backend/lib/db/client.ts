// Copyright (c) 2015 The SQLECTRON Team, 2020 Beekeeper Studio team
import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { BigQueryClient } from '@/lib/db/clients/bigquery';
import { CockroachClient } from '@/lib/db/clients/cockroach';
import { MariaDBClient } from '@/lib/db/clients/mariadb';
import { MysqlClient } from '@/lib/db/clients/mysql';
import { PostgresClient } from '@/lib/db/clients/postgresql';
import { RedshiftClient } from '@/lib/db/clients/redshift';
import { SqliteClient } from '@/lib/db/clients/sqlite';
import { SQLServerClient } from '@/lib/db/clients/sqlserver';
import { TiDBClient } from '@/lib/db/clients/tidb';
import { ConnectionType, IDbConnectionDatabase } from "@/lib/db/types";
import { SQLAnywhereClient } from "./clients/anywhere";
import { CassandraClient } from "./clients/cassandra";
import { ClickHouseClient } from "./clients/clickhouse";
import { DuckDBClient } from "./clients/duckdb";
import { FirebirdClient } from "./clients/firebird";
import { LibSQLClient } from "./clients/libsql";
import { MongoDBClient } from "./clients/mongodb";
import { OracleClient } from "./clients/oracle";

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
  ['sqlanywhere', (server, database) => {
    try {
      return new SQLAnywhereClient(server, database);
    } catch (error) {
      console.warn('SQLAnywhere client not available:', error.message);
      return createMockUnavailableClient('SQLAnywhere', error.message);
    }
  }]
],);

function createMockUnavailableClient(type: string, errorMessage: string) {
  const handler = {
    get: function (target, prop) {
      if (typeof prop === 'string' && !['then', 'catch', 'finally'].includes(prop)) {
        return async function () {
          console.warn(`${type} client method '${prop}' called but ${type} is not available: ${errorMessage}`);
          return null;
        };
      }
      return target[prop];
    }
  };

  return new Proxy({}, handler);
}

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

export function createConnection(server: IDbConnectionServer, database: IDbConnectionDatabase) {
  /**
   * Database public API
   */
  const client = clients.get(server.config.client) || FriendlyErrorClient;
  return new client(server, database);
}
