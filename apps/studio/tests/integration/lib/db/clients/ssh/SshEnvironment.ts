import { ConnectionType, IDbConnectionServerConfig } from "@/lib/db/types";
import {
  DockerComposeEnvironment,
  StartedDockerComposeEnvironment,
  Wait,
} from "testcontainers";
import { createServer } from '@commercial/backend/lib/db/server';

export const DB_CONFIGS: Partial<
  Record<
    ConnectionType,
    { container: string; host: string; port: number; user: string; password: string; database: string }
  >
> = {
  postgresql: {
    container: "test_ssh_postgres",
    host: "postgres",
    port: 5432,
    user: "bks",
    password: "example",
    database: "test",
  },
  mysql: {
    container: "test_ssh_mysql",
    host: "mysql",
    port: 3306,
    user: "bks",
    password: "example",
    database: "test",
  },
  mariadb: {
    container: "test_ssh_mariadb",
    host: "mariadb",
    port: 3306,
    user: "bks",
    password: "example",
    database: "test",
  },
  sqlserver: {
    container: "test_ssh_sqlserver",
    host: "sqlserver",
    port: 1433,
    user: "sa",
    password: "Example1!",
    database: "master",
  },
};

export class SshEnvironment {
  private environment!: StartedDockerComposeEnvironment;

  async start() {
    this.environment = await new DockerComposeEnvironment(
      "tests/docker",
      "ssh.yml"
    )
      .withWaitStrategy(
        "test_ssh_postgres",
        Wait.forLogMessage("database system is ready to accept connections", 2)
      )
      .withWaitStrategy(
        "test_ssh_mysql",
        Wait.forLogMessage("ready for connections", 2)
      )
      .withWaitStrategy(
        "test_ssh_mariadb",
        Wait.forLogMessage("ready for connections", 2)
      )
      // .withWaitStrategy(
      //   "test_ssh_sqlserver",
      //   Wait.forLogMessage("SQL Server is now ready for client connections.")
      // )
      .withWaitStrategy("test_ssh", Wait.forListeningPorts())
      .up();
  }

  async restart() {
    const container = this.environment.getContainer("test_ssh");
    if (container) {
      console.log('restarting')
      await container.restart();
      // wait until it's fully restarted
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('restarted')
    }
  }

  async stop() {
    await this.environment?.stop();
  }

  getDbHost(db: ConnectionType) {
    return this.environment.getContainer(DB_CONFIGS[db].container).getHost();
  }

  getDbPort(db: ConnectionType) {
    return this.environment
      .getContainer(DB_CONFIGS[db].container)
      .getMappedPort(DB_CONFIGS[db].port);
  }

  getSshHost() {
    return this.environment.getContainer("test_ssh").getHost();
  }

  getSshPort() {
    return 7222;
  }

  async connect(type: ConnectionType) {
    const server = createServer({
      client: type,
      host: DB_CONFIGS[type].host,
      port: DB_CONFIGS[type].port,
      user: DB_CONFIGS[type].user,
      password: DB_CONFIGS[type].password,
      ssh: {
        host: this.getSshHost(),
        port: this.getSshPort(),
        user: 'beekeeper',
        password: 'password',
      },
      trustServerCertificate: true,
    } as IDbConnectionServerConfig);
    const database = server.createConnection(DB_CONFIGS[type].database);
    await database.connect();
    return database;
  }
}
