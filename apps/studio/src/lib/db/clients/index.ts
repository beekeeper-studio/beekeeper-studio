// Copyright (c) 2015 The SQLECTRON Team
export function findClient(key: string): Client | undefined {
  const client = CLIENTS.find((cli) => cli.key === key);
  if(!client) return undefined;

  return {
    ...client,
    get supportsSocketPath(): boolean {
      return this.supports('server:socketPath');
    },
    get supportsSocketPathWithCustomPort(): boolean {
      return this.supports('server:socketPathWithCustomPort')
    },
    supports(feature: string): boolean {
      return !client.disabledFeatures?.includes(feature);
    },
  };
}

interface Client extends ClientConfig {
  readonly supportsSocketPath: boolean,
  supports: (feature: string) => boolean,
}

interface ClientConfig {
  key: string,
  name: string,
  defaultPort?: number,
  topLevelEntity?: string,
  defaultDatabase?: string,
  disabledFeatures?: string[],
}

/**
 * List of supported database clients
 */
export const CLIENTS: ClientConfig[] = [
  {
    key: 'cockroachdb',
    name: 'CockroachDB',
    defaultPort: 26257,
    disabledFeatures: [
      'server:domain',
      'server:socketPath',
      'server:socketPathWithCustomPort',
    ],
  },
  {
    key: 'mysql',
    name: 'MySQL',
    defaultPort: 3306,
    disabledFeatures: [
      'server:schema',
      'server:domain',
      'server:socketPathWithCustomPort',
    ],
  },
  {
    key: 'mariadb',
    name: 'MariaDB',
    defaultPort: 3306,
    disabledFeatures: [
      'server:schema',
      'server:domain',
      'server:socketPathWithCustomPort',
    ],
  },
  {
    key: 'postgresql',
    name: 'PostgreSQL',
    defaultDatabase: 'postgres',
    defaultPort: 5432,
    disabledFeatures: [
      'server:domain',
    ],
  },
  {
    key: 'redshift',
    name: 'Amazon Redshift',
    defaultDatabase: 'postgres',
    defaultPort: 5432,
    disabledFeatures: [
      'server:domain',
      'server:socketPath',
      'server:socketPathWithCustomPort',
    ],
  },
  {
    key: 'sqlserver',
    name: 'Microsoft SQL Server',
    defaultPort: 1433,
    disabledFeatures: [
      'server:socketPath',
      'server:socketPathWithCustomPort',
    ],
  },
  {
    key: 'sqlite',
    name: 'SQLite',
    defaultDatabase: ':memory:',
    disabledFeatures: [
      'server:ssl',
      'server:host',
      'server:port',
      'server:socketPath',
      'server:socketPathWithCustomPort',
      'server:user',
      'server:password',
      'server:schema',
      'server:domain',
      'server:ssh',
      'scriptCreateTable',
      'cancelQuery',
    ],
  },
  {
    key: 'cassandra',
    name: 'Cassandra',
    defaultPort: 9042,
    disabledFeatures: [
      'server:ssl',
      'server:socketPath',
      'server:schema',
      'server:domain',
      'scriptCreateTable',
      'cancelQuery',
      'server:socketPathWithCustomPort',
    ],
  },
  {
    key: 'oracle',
    name: 'Oracle',
    defaultPort: 1521,
    disabledFeatures: [
      'server:socketPath',
      'server:socketPathWithCustomPort',
    ]
  },
  {
    key: 'bigquery',
    name: 'BigQuery',
    defaultPort: 443,
    disabledFeatures: [
      'server:ssl',
      'server:socketPath',
      'server:socketPathWithCustomPort',
      'server:user',
      'server:password',
      'server:schema',
      'server:domain',
      'server:ssh',
      'scriptCreateTable',
    ],
  },
  {
    key: 'firebird',
    name: 'Firebird',
    defaultPort: 3050,
    disabledFeatures: [
      'server:schema',
      'server:socketPath',
      'server:socketPathWithCustomPort',
    ],
  },
  {
    key: 'tidb',
    name: 'TiDB',
    defaultPort: 4000,
    disabledFeatures: [
      'server:schema',
      'server:domain',
      'server:socketPathWithCustomPort',
    ],
  },
  {
    key: 'libsql',
    name: 'LibSQL',
    defaultPort: 8080,
    defaultDatabase: ':memory:',
    disabledFeatures: [
      'server:ssl',
      'server:host',
      'server:port',
      'server:socketPath',
      'server:socketPathWithCustomPort',
      'server:user',
      'server:password',
      'server:schema',
      'server:domain',
      'server:ssh',
      'scriptCreateTable',
      'cancelQuery',
    ],
  },
  {
    key: 'duckdb',
    name: 'DuckDB',
    defaultDatabase: ':memory:',
    disabledFeatures: [
      'server:ssl',
      'server:host',
      'server:port',
      'server:socketPath',
      'server:user',
      'server:password',
      'server:schema',
      'server:domain',
      'server:ssh',
      'cancelQuery', // TODO how to do this?
    ],
  },
  {
    key: 'trino',
    name: 'Trino',
    topLevelEntity: 'Catalog',
    defaultPort: 8080,
    disabledFeatures: [
      'server:ssl',
      'server:socketPath',
      'cancelQuery', // TODO how to do this?
    ],
  },
  {
    key: 'clickhouse',
    name: 'ClickHouse',
    defaultPort: 8123,
    disabledFeatures: [
      'server:socketPath',
    ],
  },
  {
    key: 'mongodb',
    name: 'MongoDB'
  },
  {
    key: 'sqlanywhere',
    name: 'SqlAnywhere',
    defaultPort: 2638,
    disabledFeatures: [
      'server:ssl',
      'server:socketPath'
    ]
  },
  {
    key: 'surrealdb',
    name: 'SurrealDB',
    defaultPort: 8000,
    disabledFeatures: [
      'server:socketPath',
      'server:socketPathWithCustomPort',
      'server:ssl'
    ]
  },
  {
    key: 'redis',
    name: 'Redis',
    defaultPort: 6379,
    defaultDatabase: '0',
    disabledFeatures: [
      'server:socketPath',
      'server:socketPathWithCustomPort',
      'server:schema',
      'server:domain',
      'server:ssh',
      'server:user',
      'scriptCreateTable',
      'cancelQuery'
    ],
  }
];
