import ConnectionProvider from "@commercial/backend/lib/connection-provider";
import { dbtimeout } from "@tests/lib/db";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import { IConnection } from "@/common/interfaces/IConnection";
import path from "path";
import fs from "fs";
import os from "os";
import { execSync } from "child_process";
import { SshAgent } from "@tests/lib/ssh/SshAgent";
import { SshBastionEnvironment } from "@tests/lib/ssh/SshBastionServer";

function generateKeyPair() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-ssh-test-"));
  const keyPath = path.join(dir, "test_key");

  execSync(`ssh-keygen -t ed25519 -f ${keyPath} -N "" -C "beekeeper@test"`, {
    stdio: "pipe",
  });

  const publicKey = fs.readFileSync(`${keyPath}.pub`, "utf-8").trim();

  return {
    privateKeyPath: keyPath,
    publicKey,
    remove() {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

describe("SSH Jumphost (Bastion) Tunnel Tests", () => {
  jest.setTimeout(dbtimeout);

  let environment: SshBastionEnvironment;
  let agent: SshAgent;
  let keys: ReturnType<typeof generateKeyPair>;

  beforeAll(async () => {
    await TestOrmConnection.connect();

    keys = generateKeyPair();

    agent = new SshAgent();
    agent.start();
    agent.add(keys.privateKeyPath);

    environment = new SshBastionEnvironment();
    await environment.start(keys.publicKey);

    const timeoutDefault = 5000;
    jest.setTimeout(timeoutDefault);
  });

  it("can ssh with agent", async () => {
    // @ts-ignore
    const config: IConnection = {
      connectionType: "postgresql",
      host: "postgres",
      port: 5432,
      username: "postgres",
      password: "example",
      sshEnabled: true,
      sshHost: environment.getSshEndpoint(),
      sshPort: environment.getSshPort(),
      sshUsername: "beekeeper",
      sshBastionHost: environment.getBastionHost(),
      sshBastionPort: environment.getBastionPort(),
      sshMode: "agent",
      sshKeepaliveInterval: 60,
    };

    // @ts-ignore
    const connection = ConnectionProvider.for(config, undefined, undefined, {
      sshAuthSock: agent.getSock(),
    });
    const database = connection.createConnection("integration_test");
    try {
      await expect(database.connect()).resolves.not.toThrow();
    } finally {
      await database.disconnect();
    }
  });

  afterAll(async () => {
    await environment?.stop();
    await TestOrmConnection.disconnect();
    agent?.stop();
    keys?.remove();
  });
});
