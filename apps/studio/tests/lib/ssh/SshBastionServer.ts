import {
  DockerComposeEnvironment,
  StartedDockerComposeEnvironment,
  Wait,
} from "testcontainers";

export class SshBastionEnvironment {
  private environment?: StartedDockerComposeEnvironment;

  async start(publicKey: string) {
    if (this.environment) {
      console.warn(
        "SshBastionServer.start() called but server is already running"
      );
      return;
    }

    this.environment = await new DockerComposeEnvironment(
      "tests/docker",
      "ssh-bastion.yml"
    )
      .withWaitStrategy(
        "test_ssh_bastion_postgres",
        Wait.forLogMessage("database system is ready to accept connections", 2)
      )
      .withWaitStrategy("test_ssh_jumphost", Wait.forListeningPorts())
      .withWaitStrategy("test_ssh_endpoint", Wait.forListeningPorts())
      .up();

    // The linuxserver openssh image creates the user home at /config
    const command = [
      "sh",
      "-c",
      `mkdir -p /config/.ssh && echo '${publicKey}' >> /config/.ssh/authorized_keys && chmod 700 /config/.ssh && chmod 600 /config/.ssh/authorized_keys && chown -R beekeeper:beekeeper /config/.ssh`,
    ];
    await this.environment.getContainer("test_ssh_jumphost").exec(command);
    await this.environment.getContainer("test_ssh_endpoint").exec(command);
  }

  async stop() {
    await this.environment?.stop();
    this.environment = undefined;
  }


  getBastionHost() {
    if (!this.environment) {
      throw new Error(
        "SshBastionServer.getJumphost() called before server was started"
      );
    }
    return this.environment.getContainer("test_ssh_jumphost").getHost();
  }

  getSshEndpoint() {
    return "ssh_endpoint";
  }

  getSshPort() {
    return 2222;
  }
}
