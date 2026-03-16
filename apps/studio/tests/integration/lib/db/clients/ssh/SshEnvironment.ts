import { ConnectionType, IDbConnectionServerConfig } from "@/lib/db/types";
import {
  DockerComposeEnvironment,
  StartedDockerComposeEnvironment,
  Wait,
} from "testcontainers";
import { WaitStrategy } from "testcontainers/build/wait-strategies/wait-strategy";
import { createServer } from '@commercial/backend/lib/db/server';

interface DbConfig {
  service: string;
  container: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  waitMessage?: string;
  waitCount?: number;
  waitStrategy?: WaitStrategy;
}

export const DB_CONFIGS: Partial<Record<ConnectionType, DbConfig>> = {
  postgresql: {
    service: "postgres",
    container: "test_ssh_postgres",
    host: "postgres",
    port: 5432,
    user: "bks",
    password: "example",
    database: "test",
    waitMessage: "database system is ready to accept connections",
    waitCount: 2,
  },
  mysql: {
    service: "mysql",
    container: "test_ssh_mysql",
    host: "mysql",
    port: 3306,
    user: "bks",
    password: "example",
    database: "test",
    waitMessage: "ready for connections",
    waitCount: 2,
  },
  mariadb: {
    service: "mariadb",
    container: "test_ssh_mariadb",
    host: "mariadb",
    port: 3306,
    user: "bks",
    password: "example",
    database: "test",
    waitMessage: "ready for connections",
    waitCount: 2,
  },
  sqlserver: {
    service: "sqlserver",
    container: "test_ssh_sqlserver",
    host: "sqlserver",
    port: 1433,
    user: "sa",
    password: "Example1!",
    database: "master",
    waitMessage: "SQL Server is now ready for client connections.",
  },
  clickhouse: {
    service: "clickhouse",
    container: "test_ssh_clickhouse",
    host: "clickhouse",
    port: 8123,
    user: "username",
    password: "password",
    database: "default",
    waitStrategy: Wait.forListeningPorts(),
  },
};

export class SshEnvironment {
  private environment!: StartedDockerComposeEnvironment;
  private type: ConnectionType;

  constructor(type: ConnectionType) {
    if (!DB_CONFIGS[type]) {
      throw new Error(`No SSH test config for database type: ${type}`);
    }
    this.type = type;
  }

  private get config(): DbConfig {
    return DB_CONFIGS[this.type]!;
  }

  async start() {
    const { container, waitMessage, waitCount, waitStrategy } = this.config;

    const dbWaitStrategy = waitStrategy ?? Wait.forLogMessage(waitMessage, waitCount);

    let compose = new DockerComposeEnvironment(
      "tests/docker",
      "ssh.yml"
    )
      .withWaitStrategy(container, dbWaitStrategy)
      .withWaitStrategy("test_ssh", Wait.forListeningPorts());

    this.environment = await compose.up([this.config.service, "ssh"]);
  }

  async restart() {
    const container = this.environment.getContainer("test_ssh");
    if (container) {
      await container.restart();
      // wait until it's fully restarted
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  async stop() {
    await this.environment?.stop();
  }

  getSshHost() {
    return this.environment.getContainer("test_ssh").getHost();
  }

  getSshPort() {
    return 7222;
  }

  async connect() {
    const { host, port, user, password, database } = this.config;

    const config = {
      client: this.type,
      host,
      port,
      user,
      password,
      ssh: {
        host: this.getSshHost(),
        port: this.getSshPort(),
        user: 'beekeeper',
        password: 'password',
      },
      trustServerCertificate: true,
      cassandraOptions: {
        localDataCenter: 'datacenter1',
      },
    } as IDbConnectionServerConfig;

    const server = createServer(config);
    const db = server.createConnection(database);
    await db.connect();
    return db;
  }
}
