import {
  DockerComposeEnvironment,
  StartedDockerComposeEnvironment,
  Wait,
} from "testcontainers";

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

  getDbHost() {
    return this.environment.getContainer("test_ssh_postgres").getHost();
  }

  getDbPort() {
    return this.environment
      .getContainer("test_ssh_postgres")
      .getMappedPort(5432);
  }

  getSshHost() {
    return this.environment.getContainer("test_ssh").getHost();
  }

  getSshPort() {
    return 7222;
  }
}
