import { ConnectionType, IDbConnectionServerConfig } from "@/lib/db/types";
import {
  GenericContainer,
  Network,
  StartedNetwork,
  StartedTestContainer,
  Wait,
} from "testcontainers";
import { WaitStrategy } from "testcontainers/build/wait-strategies/wait-strategy";
import { createServer } from "@commercial/backend/lib/db/server";
import { HealthCheck } from "testcontainers/build/types";
import pf from "portfinder";

interface DbConfig {
  image: string;
  networkAlias: string;
  port: number;
  user: string;
  password: string;
  database: string;
  environment: Record<string, string>;
  healthCheck?: HealthCheck;
  waitStrategy?: WaitStrategy;
  command?: string[];
}

export const DB_CONFIGS: Partial<Record<ConnectionType, DbConfig>> = {
  postgresql: {
    image: "postgres:16.4",
    networkAlias: "postgres",
    port: 5432,
    user: "postgres",
    password: "example",
    database: "integration_test",
    environment: {
      POSTGRES_USER: "postgres",
      POSTGRES_PASSWORD: "example",
      POSTGRES_DB: "integration_test",
    },
    healthCheck: {
      test: [
        "CMD-SHELL",
        'psql -h localhost -U postgres -c "select 1" -d integration_test > /dev/null',
      ],
      interval: 2000,
      timeout: 3000,
      retries: 10,
      startPeriod: 5000,
    },
  },
  mysql: {
    image: "mysql:8",
    networkAlias: "mysql",
    port: 3306,
    user: "bks",
    password: "example",
    database: "test",
    environment: {
      MYSQL_USER: "bks",
      MYSQL_PASSWORD: "example",
      MYSQL_ROOT_PASSWORD: "example",
      MYSQL_DATABASE: "test",
    },
    waitStrategy: Wait.forLogMessage("ready for connections", 2),
  },
  mariadb: {
    image: "mariadb",
    networkAlias: "mariadb",
    port: 3306,
    user: "bks",
    password: "example",
    database: "test",
    environment: {
      MYSQL_USER: "bks",
      MYSQL_PASSWORD: "example",
      MYSQL_ROOT_PASSWORD: "example",
      MYSQL_DATABASE: "test",
    },
    waitStrategy: Wait.forLogMessage("ready for connections", 2),
  },
  sqlserver: {
    image: "mcr.microsoft.com/mssql/server:2022-latest",
    networkAlias: "sqlserver",
    port: 1433,
    user: "sa",
    password: "Example1!",
    database: "master",
    environment: {
      MSSQL_PID: "Express",
      MSSQL_SA_PASSWORD: "Example1!",
      ACCEPT_EULA: "Y",
    },
    waitStrategy: Wait.forLogMessage(
      "SQL Server is now ready for client connections."
    ),
  },
  clickhouse: {
    image: "clickhouse/clickhouse-server:24.2",
    networkAlias: "clickhouse",
    port: 8123,
    user: "username",
    password: "password",
    database: "default",
    environment: {
      CLICKHOUSE_USER: "username",
      CLICKHOUSE_PASSWORD: "password",
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: "1",
    },
    waitStrategy: Wait.forListeningPorts(),
  },
  cockroachdb: {
    image: "cockroachdb/cockroach:v22.1.1",
    networkAlias: "cockroachdb",
    port: 26257,
    user: "root",
    password: "",
    database: "defaultdb",
    environment: {},
    command: ["start-single-node", "--insecure"],
    waitStrategy: Wait.forLogMessage("CockroachDB node starting at"),
  },
};

export class SshEnvironment {
  private network!: StartedNetwork;
  private dbContainer!: StartedTestContainer;
  private sshContainer!: StartedTestContainer;
  private sshHostPort!: number;
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
    const {
      image,
      networkAlias,
      environment,
      waitStrategy,
      healthCheck,
      command,
    } = this.config;

    this.network = await new Network().start();

    // Use a fixed host port so it survives container restarts
    this.sshHostPort = await pf.getPortPromise({
      port: 10000,
      stopPort: 60000,
    });

    let dbBuilder = new GenericContainer(image)
      .withNetwork(this.network)
      .withNetworkAliases(networkAlias)
      .withEnvironment(environment);

    if (command) {
      dbBuilder = dbBuilder.withCommand(command);
    }

    if (waitStrategy) {
      dbBuilder = dbBuilder.withWaitStrategy(waitStrategy);
    }

    if (healthCheck) {
      dbBuilder = dbBuilder
        .withHealthCheck(healthCheck)
        .withWaitStrategy(Wait.forHealthCheck());
    }

    const sshImage = await GenericContainer.fromDockerfile(
      "tests/docker",
      "SSHDockerFile"
    ).build();

    const sshBuilder = sshImage
      .withNetwork(this.network)
      .withEnvironment({
        PUID: "1000",
        PGID: "1000",
        TZ: "Europe/London",
        PASSWORD_ACCESS: "true",
        USER_PASSWORD: "password",
        USER_NAME: "beekeeper",
        SUDO_ACCESS: "true",
      })
      .withExposedPorts({ container: 2222, host: this.sshHostPort })
      .withHealthCheck({
        test: ["CMD-SHELL", "nc -z localhost 2222 || exit 1"],
        interval: 2000,
        timeout: 3000,
        retries: 10,
        startPeriod: 5000,
      })
      .withWaitStrategy(Wait.forHealthCheck());

    [this.dbContainer, this.sshContainer] = await Promise.all([
      dbBuilder.start(),
      sshBuilder.start(),
    ]);
  }

  async restart() {
    if (this.sshContainer) {
      await this.sshContainer.restart();
    }
  }

  async stop() {
    await Promise.all([this.dbContainer?.stop(), this.sshContainer?.stop()]);
    await this.network?.stop();
  }

  getSshHost() {
    return this.sshContainer.getHost();
  }

  getSshPort() {
    return this.sshHostPort;
  }

  async connect() {
    const { networkAlias, port, user, password, database } = this.config;

    const config = {
      client: this.type,
      host: networkAlias,
      port,
      user,
      password,
      ssh: {
        host: this.getSshHost(),
        port: this.getSshPort(),
        user: "beekeeper",
        password: "password",
      },
      trustServerCertificate: true,
    } as IDbConnectionServerConfig;

    const server = createServer(config);
    const db = server.createConnection(database);
    await db.connect();
    return db;
  }
}
