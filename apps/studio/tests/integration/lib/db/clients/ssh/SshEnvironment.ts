import { ConnectionType } from "@/lib/db/types";
import {
  DockerComposeEnvironment,
  StartedDockerComposeEnvironment,
  Wait,
} from "testcontainers";

export const DB_CONFIGS: Partial<
  Record<ConnectionType, { container: string; service: string; port: number }>
> = {
  postgresql: {
    container: "test_ssh_postgres",
    service: "postgres",
    port: 5432,
  },
  mysql: { container: "test_ssh_mysql", service: "mysql", port: 3306 },
  mariadb: { container: "test_ssh_mariadb", service: "mariadb", port: 3306 },
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
      .withWaitStrategy("test_ssh", Wait.forListeningPorts())
      .up();
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
}
